---
title: "Breaking The Graphql Bookstore API"
description: "A Step by Step walkthrough on the graphql bookstore lab"
date: 2026-05-12
tags: 
   - API Security
   - Graphql
   - Graphql Bookstore
   - Lab 
   - Writeup
---

## Introduction
Hello, welcome back to my blog. In this writeup, I’ll walk you through how I was able to break the GraphQL Bookstore API developed by [Ipsalmy](https://x.com/Dghost_Ninja), one of my mentors in this field.

You can find the lab here: https://api.graphqlbook.org/ and the Github Repository too here: https://github.com/DghostNinja/graphql-bookstore-API.

 Don’t forget to star the GitHub repository to encourage him to create more awesome labs for the community.
A special thanks also goes to [HAWD](https://www.linkedin.com/company/hackingapiswithdami) for equipping me with practical API security skills through their intensive 12-week API program. That experience helped me approach this lab with the mindset of an attacker instead of just a tester.
Now, enough with the warm-up. Let’s dive into the bookstore and start breaking things xD.
![batman](/images/MEMES/batman.gif)


## Introspection & Reconnaissance
The first thing I usually do when testing a GraphQL API is check whether introspection is enabled. If enabled, it can reveal a goldmine of information about the API, including available queries, mutations, types, and hidden functionalities.
To begin, I interacted with the application to identify the GraphQL endpoint. Once the endpoint was discovered, I sent an introspection query to determine whether schema introspection was enabled on the target.
``` {
        "query": "{__schema{queryType{name}}}"
    }
```
![introspection](/images/introspection_enabled.png)
![im in meme](/images/MEMES/im_in.bin)
With the schema exposed, We can  now  enumerate available queries and mutations and start mapping the attack surface of the application.


## Account Takeover Via Insecure Password Reset
While exploring the available mutations, I discovered a critical flaw in the forgotPassword functionality. The ***forgotPassword*** mutation accepted only a username and allowed the password to be changed without verifying whether the requester actually owned the account. There was no email verification, reset token, OTP, or any additional authentication step protecting the process.
Because of this, we  can  simply provide the username of another user and set a new password for that account, leading to full account takeover.
![Pass Reset](/images/grapql_passreset.png)

Once the mutation was executed successfully, the victim’s password was changed immediately, allowing me to log in as that user.
![login after pass reset](/images/grapql_loginafterreset.png)
![ATO Meme](/images/MEMES/after_ATO.jpeg)

### Mitigations
- Verify account ownership with OTPs, email verification links etc.
- Use password reset tokens.


## Broken Access Control on Admin Endpoints
During my investigation, I discovered that several administrative queries, including ***_adminAllPayments, _adminAllOrders, and adminStats***, were accessible to normal authenticated users without any authorization checks. These endpoints were intended for administrative use only, yet the application failed to verify whether the requesting user actually possessed administrative privileges before returning sensitive business data.
By simply sending the queries as a low privileged user, I was able to access internal application information, payment records, order details, and platform statistics.

![Payment Details Dump](/images/grapql_paymentdumps.png)
![Orders Dump](/images/grapql_allorders.png)
![platform stats](/images/grapql_platformstats.png)
The ***_internalUserSearch*** query also leaks all users PIIs including names, address, phone numbers etc.
![users PII](/images/grapql_userspii.png)
While testing object-based queries within the API, I discovered that the _internalUserCart query accepted a userId parameter and returned cart information for any user without verifying ownership of the requested resource.
![cart leaked](/images/grapql_cartleaked.png)
This meant that an authenticated user could supply the ID of another user and retrieve their cart details directly from the server.
### Mitigations
- Implement proper server-side authorization.
- Enforce role checks at reolver level.



## Server Side Request Forgery(SSRF)
During further testing, I discovered that the ***_fetchExternalResource*** query fetched content directly from a user-supplied URL. This appeared to be a normal feature for retrieving external resources. However, the application failed to validate or restrict the destinations that the server could access. By supplying internal endpoints and local file references instead of public URLs, I was able to make the server request sensitive internal resources on my behalf.This files included private SSH keys, .env files , /etc/shadow, internal configuration files etc.

![SSRF 1](/images/grapql_ssrf1.png)
![SSRf 2](/images/grapql_ssrf2.png)
![SSRf 3](/images/grapql_ssrf3.png)

### Mitigations
- Implement strict allowed URLs.
- Block internal and local network access. 
- Disable dangerous URL schemes like file://.

## Broken Object Level Authorization(BOLA)
While testing the API, I also discovered that the ***_internalUserCart*** query accepted a userId parameter and returned cart information for any user without verifying ownership of the requested resource. This meant that an authenticated user could supply the ID of another user and retrieve their cart details directly from the server causing privacy violation. Although the userIds  are not predictable, but with the help of the previous exploit we alraedy have all users ID.
![cart Leaked](/images/grapql_cartleaked.png)

The application also exposes authors Personally Identifiable Information (PII) when a valid victim id is provided.
![author's PII](/images/authorspii.png)
![author's PII](/images/autorspii2.png)
In essence, any authenticated user can retrieve another user’s or author's private profile data simply by knowing or obtaining their id.

### Mitigations
- Enforce ownership checks on every request and object.

## Privilege Escalation Via Mass Assignment
To exploit this vulnerability, I first registered a normal user account and logged into the application to inspect the server’s response. From the login response, I noticed that my account was assigned the role user and we already discovered in  the introspection phase, that the application supports different  roles, including ***admin user and staff***. This suggested that role management might be exposed through user controlled input.To test thi we will  use the ***register*** mutation again,but this time include the role field and set its value to admin. ![Mass_request](/images/grapql_mass.png) ![Mass_response](/images/grapql_mass2.png)
The server accepted the request and created a new account with administrative privileges, and we can now access all restricted administrative functions with this account.
### Mitigations
- Enforce role assignment on backend only.
- Whitelist allowed fields.
- Use authorization checks at resolver level

## Payment Bypass
During testing of the checkout functionality, I discovered that the ***createOrder*** mutation allowed orders to be created directly from a user’s cart without verifying whether a successful payment had been made.
![payment bypass](/images/grapql_paymentpass.png)
![payment bypass](/images/grapql_paymentpass1.png)
The server accepted the request and generated a valid order even though no payment had been processed. This vulnerability results in a Payment Bypass, where attackers can obtain products or services without completing the required financial transaction.
## Unrestricted Resource Consuption via Batching
The ***_batchQuery*** endpoint accepts an array of raw GraphQL query strings and executes them sequentially on the server within a single HTTP request. This feature allows multiple operations in one request, and also introduces a significant abuse risk. Because the server processes each query without strict limits or prioritization, an attacker can bundle multiple expensive operations into a single request and effectively bypass rate limiting mechanisms. This also allows request amplification, where a single HTTP request can trigger a large number of backend operations, increasing CPU, memory, and database load disproportionately.

![consumption](/images/grapql_bypass.png)
![Consumption1](/images/grapql_bypass1.png)
The increase in response time clearly indicates that as more queries are bundled together, the server consumes more resources. An attacker could abuse this behavior by continuously increasing the number of queries in a single request potentially exhausting server resources and degrading performance.


## Conclusion
These were my personal findings while testing the GraphQL Bookstore API, and I believe there are still many more vulnerabilities hiding between the shelves waiting to be discovered.This lab was a great opportunity to practice real world GraphQL API testing techniques as a someone who just started learning Graphql. I’ll continue updating this writeup if I discover additional issues or interesting attack paths in the future, Till then Thanks for reading and keep hacking <3.
![end](/images/MEMES/the_end.gif)

~[***kwesilarry***](https://x.com/0xWizard_)

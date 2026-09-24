---
title: "Damn Vulnerable RESTaurant API"
description: "A walkthrough on th DVRA lab"
date: 2026-02-19
draft: false
tags:
  - WebSecurity
  - AppSec
  - API Security 
  - Damn Vulnerable RESTaurant API
  - writeup
  - Lab
---

## Introduction
I applied for the  [HackingAPIsWithDami](https://x.com/HackingAPIWDami?s=20) challenge, and in the first week we were given some courses and the Vulnerable RESTaurant API Lab to test our hands on skills. 
The lab and  installation guid can be found on here: [Vulnerable RESTaurant API](https://github.com/theowni/Damn-Vulnerable-RESTaurant-API-Game).

> NB: I hosted mine locally on `ubuntu_server:8080`, so the base URL in this write-up may differ from yours.

In this write-up, I will be exploiting the API step by step and mapping each vulnerability to the OWASP API Top 10, including practical remediation strategies.


## Setup & Endpoint Mapping
After installing the application locally, the first step is reconnaissance. Since this is a REST API, a goldmine often sits in plain sight: the OpenAPI specification.

We access the `/openapi.json` endpoint on: `http://ubuntu_server:8080/openapi.json.` This endpoint exposes the full API schema including: Available endpoints,HTTP methods, Request Bodies,Parameters etc.    
we can now download this `openapi.json` and import it into our tool(i will be using postman but you can also use burp or any tool you prefer), Enumerate enpoints and begin mapping attack surfaces.

First, Open postman, click on import and select the downnloaded `openapi.json` file.

![Importing openapi.json to postman](/images/import_in_postman.png)
![Importing openapi.json to postman](/images/import_in_postman2.png)
 We have the file imported in postman and we can see all the endpoints too. Now, let's get our hands dirty!

## API1:BOLA(Broken Object Level Authorization)

Broken Object Level Authorization (BOLA) is a critical API vulnerability that allows an attacker to bypass access control mechanisms and perform actions on specific objects without proper permissions using unique identifiers such as user IDs, usernames, account numbers, or transaction IDs.


### Exploitation

To exploit BOLA,Register 2 accounts like we are testing for IDOR. Let’s call both **Account1** and **Account2** respectively. In Postman, set your baseurl in the collection to `http://ubuntu_server:8080` and use `/register` endpoint.
![Account Registration](/images/DVRA_register1.png)
The API uses JWT for authorization, So we need to obtain a token by sending credentials to the POST `/token` endpoint before we can perform any action.
![Getting JWT Token](/images/DVRA_get_token.png)
To test an ID parameter or unique number, we are going to  create order so we can have order history and oder id to play with, Don't forget to add your JWT token to authorization when creating the order.
![Create order](/images/DVRA_create_order.png)
Note the 'id' after creating the order,Let's try accessing this order with **Account1** authorization token(JWT) and see if we the APi is performing checks on who have access to what.
![BOLA1](/images/DVRA_BOLA1.png)
![BOLA2](/images/DVRA_BOLA2.png)
Since the oder id is predictable(integers) we can try to access other users oder details by trying random numbers at the API endpoint and the images above clearly shows that the API endpoint does not properly check if the user has permission to access the requested object.

There is also another BOLA at the `Update Profile` endpoint where we can change user's personal information using their usernames as identifiers. Try to change **Account2**'s phone number with **Account1**'s token and verify if the change was successful.
![BOLA3](/images/DVRA_BOLA3.png)
![BOLA4](/images/DVRA_BOLA4.png)

### Fix
- Use the authorization mechanism to check if the logged-in user has access to perform the requested action on the record in every function that uses an input from the client to access a record in the database.
- Prefer the use of random and unpredictable values as GUIDs for records' IDs.

## API2: Broken Authentication

Broken Authentication is one of the most dangerous vulnerabilities in web and API security. It happens when an application fails to properly verify user identity or enforce authentication controls, allowing attackers to impersonate users or access protected resources.

### Exploitation
To exploit, Let's first try and decode our JWT token obtained in the previous section using [xjwt.io](https://xjwt.io/).
![decoded JWT](/images/decoded_jwt.png)
Noticed the payload contains the username Account2 in the sub field. This is the username of the currently authenticated user. Since this is a restaurant, Let's assume the username of one of the employee is chef.
We can craft the token for this user using [xjwt.io](https://xjwt.io/). To do this, open the page and enter the JWT token in the JWT Encoder/Decoder tab, then update the payload sub claim with the name **chef** and click on the the generate token.Since we don't have the signing key(secret), we will leave the signature part of the token with a trailing dot and hit the `/profile` endpoint to see if the API checks and verifies the signature part of the token.
![Forged Token](/images/forged_token.png)
![JWT_vuln_confirmed](/images/jwt_vuln.png)
![yes_meme](/images/MEMES/wow.gif)
It worked!! The API authenticated us as 'Chef' with an invalid JWT Token, This  vulnerability is dangerous because it  allows an attacker to impersonate any chosen user when the victim's username is known. As a result, the attacker can perform any action in the context of the victim.


**Tip:** Since the application is using HS256 algorithm, you can also try and bruteforce to find the secret key used to sign the tokens. 

### Fix
- Enforce strict checks on your authentication token.
- Sign your tokens with  strong secret keys.



## API3: BOPLA (Broken Object Property Level Authentication)
Broken Object Property Level Authorization is an API vulnerability that allows attackers to bypass access control mechanisms and manipulate individual properties of an object without proper permissions. This vulnerability occurs when the API does not adequately enforce authorization checks at the property level, enabling unauthorized users to modify sensitive fields within an object.This vulnerability is also know as Mass Assignment.

### Exploitation
Do you remember after creating our user(Account2), we were given the role of a customer? What will happen if we change this role to Employee or Chef?[***thinks deep***]. The only way to find out is to try so let's update our profile and set our role to Employee.
![Changing ROLE](/images/BOPLA1.png)
Let's verify the role change by checking our profile, we can also try to  access privileged endpoints like creating a new menu item.
![Verifying BOPLA](/images/BOPLA2.png)
With this, an attacker would be able to perform any sensitive action in the API, including accessing user's data, orders, modifying and deleting records.

### Fix
- Sensitive endpoints like `update_role`  containing senstive objects should  be accessible to only admins or should not be made public. 
- Allow changes only to the object's properties that should be updated by the client.

## API4: Unrestricted Resource Consumption
Unrestricted Resource Consumption vulnerability occurs when API endpoints use expensive operations without any restrictions. Attackers can exploit this by repeatedly calling the endpoint to use an outstanding amount of resources(CPU, memory, bandwidth,database queries etc.)

### Exploitation
After sending a few requests to the `/reset-password` endpoint I noticed that the  API lacks any rate limiting or usage controls on how often a user can request a password reset and trigger sending a PIN code through SMS. As a result, an attacker can write a script that epeatedly calls `/reset-password` endpoint with a known username to quickly trigger dozens or hundreds of code sends.This can lead to DOS, Increased operational costs through SMS charges and also spam victims inbox.

### Fix
- Implement a limit on how often a client can interact with the API within a defined timeframe (rate limiting).
- Track resource usage and set alerts for abnormal spikes.


## API5: (BFLA) Broken Function Level Authorization
BFLA is  a security vulnerability where an application does not properly enforce authorization checks at the function or API endpoint level. This can allow a user to access or perform actions they shouldn’t be able to, based on their role or permissions.

### Exploitation
To exploit this, we need to create a new user or bring our Account2 role back to Customer. Looking at the delete menu endpoint, we expect only Chefs and Employees to be able to delete a menu not regular customer but let's try deleting a menu with our customer token to see if the API will validate our role and restrict us .
![Getting menu](/images/BFLA1.png)
![Deleting a menu](/images/BFLA2.png)
![Confirmation](/images/BFLA3.png)
We can now confirm that the menu with an id of 1 has been deleted successfully as a Customer, This demonstrates Broken Function Level Authorization, where the API fails to properly verify that the user has the necessary role or permissions to execute administrative functions.

### Fix
- Implement RBAC(Role Based Access Control)
- Validate the authenticated user's role in the API endpoint's logic with a simple if statement.
- Log and monitor all privileged function access to detect unauthorized attempts.

## API6: Unrestricted Access to Sensitive Business Flows
Unrestrictive Access to Sensitive Business Flows refers to a vulnerability in which APIs expose critical functionalities without adequate safeguards. It allows attackers to exploit these functionalities in unintended and malicious ways, potentially causing significant harm to the business.

### Exploitation
To exploit this vulnerability, Let's first  go to the `referral-code` endpoint to generate a referral code.
![Referral code](/images/Referral_code.png)
We need to send this referral code to our friends to get a discount on our first order, but we have no friends, so we have to be our friend and apply the code ourselves.Go to the `apply-referral` endpoint and apply the referral code to see magic.I applied the code four times out of greed and all went through.
![Applying Referral Code](/images/apply-code.png)
![Magic Meme](/images/MEMES/magic.gif)
Now Let's list all our discount coupons to verify if the attack was actually successful.
![Coupons](/images/coupons.png)
Booom, Its Gameover!!

Successfully applying our own referral code demonstrates unrestricted access to sensitive business flows, where the API fails to validate that the referrer and referee are different users. Additionally, allowing multiple applications  indicates missing safeguards against replay attacks and coupon accumulation fraud, which could lead to significant financial losses for the business.

### Fix
- Restricts users from applying their own referral code.
- Allow Referral Code Only Once per user.
- Never Trust Client state.

## API7: SSRf(Server Side Request Forgery)
SSRF is a vulnerability that allows attackers to send requests on behalf of a server, During an SSRF, attackers forge the request signatures of the vulnerable server, allowing them to assume a privileged position on a network, bypass firewall controls, and gain access to internal services.

### Exploitation
To exploit this vulnerability we need to find a request that takes a URL and process it, after going through all the endpoints I noticed that the `create-menu` endpoint has a field called "image_url" which is a good place to test for SSRF. The API endpoint  properly check the role of the user which ensures that only employees and chefs can create menu items so we need to update our role to Employee again.
![SSRf 1](/images/SSRF.png)
Why `http://127.0.0.1:8080/reset-chef-password`? If you go through the API's documentations and configurations, you will notice that the `reset-chef-password` is an internal endpoint that is used to reset the password for the chef who is more like the admin of the Restaurant.

Now, Let's copy the image_base64 and try decoding it to see the actual content.
![Chef's Pasword](/images/SSRF2.png)
Just like that we were able to hit the internal endpoint to reset the chef's password and we also got the new password of the chef. We can now authenticate as the chef using username chef and the extracted password. We can confirm by accessing an admin endpoint like `/admin/stats/disk`.

### Fix
- Never trust user supplied URL and always validate and sanitize all client-supplied input data.
- Use allowlists of URL scheme and ports.
- Use a well-tested and maintained URL parser to avoid issues caused by URL parsing inconsistencies.

## API8: Security Misconfiguration
Security Misconfiguration is a common API vulnerability that occurs when security controls are either improperly configured or left at default settings. This risk arises from incomplete or ad-hoc configurations, open cloud storage, misconfigured HTTP headers, unnecessary features enabled, or verbose error messages containing sensitive information.

### Exploit 
There is major security misconfiguration in the API thus it's CORS(Cross Origin Resource sharing) policy is misconfigured such that it allows any domain with "restaurant.com" in it to fetch resources. Let's use any of the endpoints and set the origin header to our attacker's domain and check the Access control Allow Origin header in the response to confirm the CORS misconfiguration.
![CORS misconfigured](/images/CORS.png)

### Fix
- Implement Proper CORS Policy with strict a regex or just lists of truted domains.
- Set the Access Control Allow Credential header to true on only trusted domains.
- Keep Dependencies & Frameworks Updated Regularly, patch libraries, packages, and server software.


## API9: Improper Inventory Management
This is  an API vulnerability that occurs when an application fails to properly track, update, restrict access to API endpoints or sensitive resources. This risk arises when deprecated or undocumented API endpoints remain accessible, rate limits are misconfigured or excessive data exposure is allowed due to weak inventory controls.

### Exploitation
There is a `/debug` endpoint that is hidden from the documentation schema but is still accessible without any authentication or authorization. Move to any of the endpoints and change it to `/debug` without the authorization token, then send the request.
![Debug](/images/debug.png)
Successfully accessing the debug endpoint demonstrates improper inventory management, where undocumented endpoints are left exposed in production. The presence of sensitive information such as database credentials, system details, and environment variables significantly increases the risk of information disclosure, privilege escalation, and system compromise.

### FIx
- Block acces to debug,staging and dev environment or include them  in non-production environment only. 
- Maintain an API Inventory: Track all public, private, internal, and third-party APIs.
- Monitor & Log API Activity Set up logging to detect usage of outdated or unknown endpoints.

## API10: Unsafe Consumption of APIs
This vulnerability occurs when developers integrate third-party or internal APIs into their applications without properly validating, sanitizing, or securing the data received from those APIs. This vulnerability assumes that data from external APIs is trustworthy and safe.
 

 ### Exploitation
I struggled to find any third party API used by the application but i couldn't find some, i promise i will update this writeup once i figure it out.

### FIx
- When evaluating service providers, assess their API security posture.
- Always validate and properly sanitize data received from integrated APIs before using it.
- Sanitize any input data, especially when interacting with APIs that could be prone to injection attacks or data manipulation.


## Conclusion
Well, that wraps up our deep dive into the beautifully vulnerable world of the Damn RESTaurant API. From Broken Authentication to BOLA, BOPLA, SSRF, and our ever-reliable chaos generator, Security Misconfiguration, this lab served a full-course meal of API insecurities.

API security is not about throwing tools at endpoints and hoping something breaks. It is about understanding behavior, state, authorization boundaries, and how developers think when they assume “this should be fine.”

So keep digging. Keep testing. Keep thinking like an attacker, but building like a defender.

And as always, test within scope. The only thing worse than a vulnerable API is an unethical hacker.

Until next time, Keep Hacking <3

![The end](/images/MEMES/the_end.gif)


~[***kwesilarry***](https://x.com/0xWizard_)

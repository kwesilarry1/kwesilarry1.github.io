---
date: 2025-06-14
title: "How I Hacked A Vulnerable Bank Application"
tags:
  - WebSecurity
  - AppSec
  - Lab
  - vulnbank
---

 
## Introduction
Good day  hackers, welcome to my blog again. In this writeup i
will take you through how i was able to exploit an intentional
Vulnerable Bank Application by [Ghost St.
Badmus](https://x.com/commando_skiipz?t=rPix1FAXa-vFamgkrxjjnQ&s=09),
One of the best Application Security Engineers in the industry.

**You can find the Lab here:** [Vulnerable Bank Application
🏦](https://github.com/Commando-X/vuln-bank.git) or
[vulnbank.org](http://vulnbank.org).

## Authentication & Authorization Vulnerabilities

### SQL Injection in login

The first thing we will see when we access the application is the
Login/Register page,we will try logging in with a simple SQLI payload to
see if the application is vulnerable to SQLI. After using **'or 1=1- -**
as the username and **pass** as password,we were logged in as the admin.
![Login_page](/images/login_page.png)
![SQLI payload](/images/sqli.png)
![admin acess](/images/admin_access.png)

### Mass Assignment Leading Privilege Escalation
To exploit this go to the register page and try creating account,
intercept the request with your proxy tool(i will be using burpsuite for
this task).Forward the request and monitor the response from the server,
we noticed a parameter **is_admin** was set to false in the reponse.
![Account Creation](/images/register.png) Let's set the
parameter to true and add it to our account creation request to see if
we will get admin privileges.
![register_admin](/images/register_admin.png) Boom!! it
worked, Logged into the account and was presented with the admin panel
![forged_admin](/images/forged_admin.png)

### Mass Assignment Leading To Account Balance Manipulation

When creating an ccount, a parameter in the respoonse from the server
stood out thus, ***balance***.Let's add this parameter to our account
creation request and set the value to any amount of our choice.Login
into the account after sending the request and the amount will be
reflected. ![manipulating account
balance](/images/balance_mani.png)![Manipulated
balance](/images/manipulated_balance.png)
### Weak Password Reset Mechanism(3-didgit PIN)

The reset password functionality is vulnerable to brute force because it
is easy to guess 3-digit pin and also there is no rate limit protection
in the apllication.Let's go the reset password endpoint and request for
the 3-digit pin. ![pass_reset](/images/pass_reset.png)
We will be redirected to a page to provide the 3-digit PIN and our new
password, intercept the request and send to intruder.Add the payload
positon to the ***reset_pin*** parameter,payload type to bruteforcer
with minimum and maximum length set to three and start the attack.
![Brutforcing_3-digit PIN](/images/brute-force.png)
After the attack one of the payload returned with status code 200,
meaning that was the pin and the password was changed successfully,This
means an attacker can reset users password with just their username.
![reset_password request](/images/reset_pass.png)
![reset_password response](/images/reset1_pass.png)
### Token Stored in Local Storage

Users session tokens are stored locally in the browser, with this anyone
who have access to the victim's browser will be able able to view the
session token.First, right-click in the page and select inspector or
developer tools(depends on the browser you are using), then go to the
storage tab, You will see the token stored there.
![stored_token](/images/stored_token.png)

### No server-side token invalidation
I noticed the server does not validate the tokens sent with the
request,with invalid token the server still respond with 200(ok).
![valid token](/images/token.png) ![invalid
token](/images/token1.png)

## Transcation Vulnerabilities

### Negative Amount Transfers Possible

For this you need login into your account and go to the Money Transfer
endpoint, enter the recipient's account number,negative amount and click
on send money.Note that our initial account balance was \$2000.0 before
sending the money. ![negative
amounts](/images/send_negative.png)
![transaction_history_after_negatve_amount_transfer](/images/transct_history.png)
Now let's check our account balance, you will notice that the negative
amount has been added to our account balance. Imagine sending money to
someone and your account balance keeps increasing, isn't this fun?
![balance after negative
transfer](/images/balance_after_neg_trans.png)
### No Amount Validation

The application does not validate the amount of money that is beeing
sent, you can send no money or simply use 0 as amount to be transferred
and it will get sent. ![no amount
transfer](/images/no_amount.png) ![no amount
transfer](/images/no_amount1.png)

### Transaction history information disclosure

By obtaining a user's account number, an attacker can access their
transaction history by navigating to the **/transactions** endpoint and
replacing their own account number with the victim's in the URL.
![trans_history](/images/tran_history0.png)
![trans_history](/images/tran_history.png)

### Other Transcation vulnerabilities

There are other transaction vulnerabilities like **No validation on
recipient accounts** and **No transaction limits** where the application
does not validate the recipient's account number,and users can also send
any amount of money without any limits.With no transaction limit if an
attacker gets access to a victim's account he/she can send all the money
in the account at once which isn't ideal.

## Client and Server-Side Flaws

### Cross Site Scripting(Stored XSS)

One way to prove the appliaction is vulnerable to XSS is by making it
run javascript code that will generate a popup box if the payload
succeeds.To do this I created account with a simple XSS payload as the
username,and noticed the script executes the moment we log into the
account. ![XSS payload](/images/X1.png) ![XSS
payload](/images/XSS1.png) But hey, note that this is  a self-xss and it must be chained with other vulnerabilities like CSRF to make it impactful but unfornately the appliaction does not allow us to edit/change our name after account creation.

#### Stored XSS
During money transfer, there is a description textbox where you can add a message for reference or whatever reason you are sending the money. You can add a simple XSS payload to the textbox and see if it will get executed when the victim logs into his account.
![stored xss](/images/xss1.png)
![Stored xss executed](/images/xss2.png)


## Session Management Vulnerabilities

### Token Vulnerabilities

With ones session token, an attacker can impersonate the user and make
transactions without logging into the victim's account. Let's first note
the account balance and the session token of the victim. ![Victim's
balance](/images/victims_balance.png)![Victim's
token](/images/victims_token.png) Now login into the
attacker's account and go to the ***/transfer*** endpoint, intercept the
request and swap your token with the victim's token and send the
request. Figure 1.1 is the initial request with attacker's token, figure
1.2 is request with victim's token and figure 1.3 is the balance of the
victim after the attack.
 ![attacker's token](/images/attacker's_token.png)
 ![swaped token](/images/swaped_token.png) 
 ![balance after attack](/images/balance.png)

 ### Weak JWT Secret
 The application uses a JWT (JSON Web Token) for session handling with the HS256 algorithm. One of the most effective ways to compromise this system is to discover the secret used to sign the tokens and then create our own tokens. To find the secret, Go to [xjwt.io](https://xjwt.io/) and use their JWT cracker to crack the secret.
 ![JWT cracking](/images/jwt1.png)
 ![JWT crackinng](/images/jwt2.png)With the secret you can now sign tokens by using the victim's name, userid or account number and provide that token in the cookie header to take over the victim's account.

## File Operations

### SSRF via URL-based profile image import
Server Side Request Forgery (SSRF) is a vulnerability that lets attacker send request on behalf of a server.

In the application, you can add a profile picture from a URL, and this is the best place to test for SSRF,
#### Blind SSRF
With Blind SSRF, you cannot read internal files or access internal services directly, but you can make the target send requests to an external server you control then monitor your server logs for requests from the target.You can then use it to scan the internal network for open ports, discover services and map out the network. To do this capture the requests to update your profile picture with your burp and use your burp collaborator payload(for PRO users only) as the url to import and monitor collaborator for requests from the serve.
![blind ssrf](/images/bssrf.png)
![blind ssrf](/images/bssrf1.png)
This is an evidence that the application is vulnerable to blind SSRF and we can later go on to scan the internal network with our payload.

#### Classic SSRF
With this type of SSRF, we intend to fetch the resources from the internal server directly mostly from localhost(127.0.0.1) or cloud metadata if avaialable. So first we will submit the localhost as our URL and see if the server will fetch us the resources there.
![SSRF Testing](/images/ssrf.png)
Go to the history tab after sending the request and you will notice a GET request that fetches the internal resources.
![SSRF testing](/images/ssrf2.png)
We can later go on and fetch cloud metadata, the images below are some POCs for this attack.
![SSRF cloud metdata](/images/ssrf3.png)
![SSRF cloud metdata](/images/ssrf4.png)
![SSRF cloud metdata](/images/ssrf5.png)
![SSRF cloud metdata](/images/ssrf6.png)


## AI/Chatbot hacking
The vulnank has been updated with a chatbot that can help you bank
easily, you can also ask it questions.We will try some prompt injections
to see if we can levearage it to get some information from the
application. Here are the images of the prompts i tried to get the
application's database and the bot was able to transfer money from a
user account with just their account number.
![chatbot_hacking](/images/AI1.png)
![chatbot_hacking](/images/AI2.png)
![chatbot_hacking](/images/AI3.png)
![chatbot_hacking](/images/AI4.png)
![chatbot_hacking](/images/AI6.png)

These vulnerabilities are the result of my own testing. I'm sure there's
more to uncover, so feel free to take a look yourself---you might spot
something I missed. I'll be updating this write-up as I find new issues
or insights. Happy Hacking <3

~[***kwesilarry***](https://x.com/0xWizard_)

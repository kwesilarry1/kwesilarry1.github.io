---
title: "How I Bought a $1337 Jacket for  $100"
description: "A simple business logic vulnerability that can affect Ecommerce websites."
date: 2026-10-25
tags: 
   - WebSecurity
   - Business Logic
   - Lab 
   - Writeup
---
## Introdution
Hey Guys, Welcome back to my blog again! In this writeup, I'll demonstrate how to exploit a business logic vulnerability in an ecommerce application and discuss how to protect our applications against this type of issue.

**NB:** This is for educational purposes only and all  actions were performed in an authorized environment.
 
## The Exploit
To exploit this vulnerability, we'll first interact with the application, place an order, and observe how it handles user input. We'll use Burp Suite to intercept and inspect the HTTP requests sent by the application. Before we begin, let's take note of the store credit available in our account.
![Account Details](/images/account+details.png)
Next we will select the jacket we want to buy, add to cart and attempt to place  the order.
![Order Rejected](/images/order+rejected.png)
As expected, the application rejects our order because our available store credit is insufficient to cover the cost.However, let's investigate further. We'll navigate to our HTTP history in Burp Suite and locate the request responsible for adding products to the cart. Our goal is to determine whether manipulating this request could allow us to bypass the application's credit validation.

![Cart Request](/images/Request.png)
If you study the request carefully an interesting question comes to mind **What would happen if we changed the quantity to a negative number?** There's only one way to find out!
![burp negative request](/images/neg+quantity.png)
![neq+req+result](/images/neq+req+res.png)
As shown above, the application accepts the negative quantity and recalculates the cart total, reducing the overall cost of the order. This suggests that the application does not properly validate the quantity supplied by the user. By providing a negative quantity, we can manipulate the cart's total value.
Next, we'll clear the cart, add the leather jacket again, and include another product whose quantity we can manipulate to reduce the total cost of the order.

![Final neq req](/images/final.png)
![Final req re](/images/final+rq+res.png)
After manipulating the cart, we attempt to place the order again.

![Successful order](/images/Successfulorder.png)
**Success!** We successfully reduced the total cost of the jacket and completed the purchase using this business logic vulnerability.This demonstrates how improper input validation and incorrect price calculations can allow an attacker to manipulate an order's total and potentially purchase expensive items at a fraction of their intended price.

## Fix

To prevent this type of business logic vulnerability, developers should consider the following security measures:

1. **Implement Server-Side Input Validation:** Always validate product quantities on the server before processing cart requests. Reject negative quantities, zero quantities where inappropriate, and invalid input types. Never rely solely on client-side validation.

2. **Perform Price Calculations on the Server:** Never trust prices, subtotals, or order totals supplied by the client. 

3. **Validate the Cart Before Checkout:** Before processing an order, verify that all product quantities are valid and that the final order total matches the server-calculated amount



~[***kwesilarry***](https://x.com/0xWizard_)

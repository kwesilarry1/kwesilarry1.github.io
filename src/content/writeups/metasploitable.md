---
date: 2025-04-10
title: "How to set up Metasploitable Lab for Web Hacking"
tags: 
   - HomeLab
   - Metaploitable
---

Hey there! it's been a while. In this write-up, I'll be showing you how
to set up your own metalsploitable lab for web application security and
penetration testing.

------------------------------------------------------------------------

### Downloading Metasploitable 2

First, go to google and search for metasploitable 2 and choose the one
from ***sourceforge.net*** or visit the link provided below:
(<https://sourceforge.net/projects/metasploitable/)>. Click on
***Download*** and wait for some seconds for the zip file to download
automatically.

### Setting Up

Extract the ZIP file using your preferred ZIP extractor:
![Extracting](/images/extract.png) Open virtualbox,click
on New at the top, Enter: ![new
machine](/images/create.png) Enter the name of your
machine, make sure the "Type" and "Version" is the same as the one in
the image below.Leave the "ISO Image" field and click on next: ![setting
up](/images/settings.png) Choose your preferred RAM and
CPU size to allocate to the machine and click on next,i will use the
default size since metasploitable doesn't require much space and
resources. ![hardware](/images/hardware.png) Select "Use
an Existing Virtual Hard Disk File" and click on the folder icon:
![selecting disk](/images/metasploitable1.png) Click on
"Add", locate where you extracted the zip file and select
"Metasploitable.vmdk".Click on Choose and finally next:
![VMDK](/images/metasploitable2.png) Now click on
"Start" to boot the machine and wait for some seconds,the default
username and password is **msfadmin**:
![start](/images/start.png) Type ***ifconfig*** to check
the machine's IP Address ![ip](/images/ipp.png) Open
your browser, paste the metasploitable ip in the search bar and you
should see the list of vulnerable servers been hosted on metasploitable
you can get your hands dirty with.
![servers](/images/servers.png) I will do writeups on
how to hack some of these servers.

Thanks for reading. Happy hacking <3

~[***kwesilarry***](https://x.com/0xWizard_)

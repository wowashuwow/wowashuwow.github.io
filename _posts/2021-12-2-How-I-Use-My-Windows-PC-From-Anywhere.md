---
layout: post
title: How I Use My Windows PC from Anywhere
image: '/images/fi-How-I-Use-My-Windows-PC-From-Anywhere.jpg'
description: Set up remote access for Windows in 10 minutes
tags: [Guides]
---

<p>Sometimes, I want to be able to use my PC when I’m traveling. But carrying that big box  isn’t always feasible, nor is it ideal. I have postponed way too many trips just because I won’t be able to use my PC.</p>



<p>As a solution, I have looked into setting up remote desktop, but I’m not happy with the traditional method – using WoL (Wake on LAN) to switch on the computer and using a program like TeamViewer or Splashtop for remote access. With all the port forwarding that you have to configure on your router while ensuring network security, WoL was too much of a hassle. It also wasn’t 100% reliable.</p>



<p>I finally found an alternate solution:</p>



<ol><li>Power on PC by BIOS RTC (Real Time Clock), and</li><li>Use <a href="https://parsec.app/">Parsec</a> for remote access</li></ol>



<p>While this isn’t an ideal solution as you do not have complete control over when the PC boots (more on that in the notes), it works flawlessly and it can be implemented within 5 minutes.</p>



<h2 class="has-large-font-size">Power on by RTC</h2>



<p>Power on by RTC is a BIOS feature that boots the computer at a set time. You can find it under the APM (Advanced Power Management) settings in your BIOS. Here’s <a href="https://www.asus.com/support/FAQ/1043640">how to set up Power on by RTC</a> on an ASUS motherboard. The instructions should be similar for other motherboard manufacturers. I have set my PC to boot everyday at 9am.</p>



<h2 class="has-large-font-size">Parsec</h2>



<p><a href="https://parsec.app/">Parsec</a> is a free remote desktop program. It’s incredibly easy to set up and use, and the remote desktop experience is honestly pretty rad. Having used TeamViewer and Splashtop before, I find Parsec to be better due to its excellent functionality, ease of use, and cost.</p>



<p>All you have to do is create an account, and install Parsec on the host and client computers. As long as Parsec is running on the host computer, the host computer will show up in the “Computers” tab on all your other devices and you can remote desktop in one click.</p>

<img src="{{ site.baseurl }}/images/parsec-screenshot.png" alt="screenshot of parsec dashboard">

<h2 class="has-large-font-size">Configuration</h2>



<p>For this setup to work, your host Windows machine:</p>



<ol><li>Should have only one user account</li><li>Require no login password</li></ol>



<p>This is necessary as the host computer needs to boot up <em>and</em> login for the Parsec service to start.</p>



<p>That’s it! You have yourself a remote desktop solution that you set up and get running within five minutes.</p>



<h2 class="has-large-font-size">Notes / a few considerations:</h2>



<p>I realize this is not an ideal solution as you do not have complete control and you may have to leave your computer idling for long periods.</p>



<h3 class="has-medium-font-size">Running costs:</h3>



<p>Electricity is cheap and modern computers do not consume much power when idling. My build, which has pretty respectable specs (Ryzen 2600, GTX 1070, with a 650W PSU), probably consumes ~100W on idle. If I were to keep my system running for 24hrsX30days, it would cost me less than ₹400/month (~$5.4/month).</p>



<h3 class="has-medium-font-size">Control:</h3>



<p>If you shut down your system, you will be able to next use it only on the next day, when it boots at your set time. To avoid getting into situations where I might not be able to use my PC when I wanted to, I just leave it running for the entire day regardless of whether I use it or not. I usually shut down before I sleep. This saves some energy.</p>



<h3 class="has-medium-font-size">Caveats:</h3>



<ul><li>Security (no password)</li><li>No multiple user accounts</li></ul>



<h2 class="has-large-font-size">A better solution</h2>



<p>Here’s an even better solution that does not involve setting up Wake on LAN, that offers more energy savings and a lot more control:</p>



<p>You can use an internet-connected <b>smart plug</b> that can be switched on/off using a phone, in combination with the “Restore on AC Power Loss” BIOS feature of your motherboard. This will allow you to automatically power on the PC whenever you (remotely) switch on the smart plug.</p>

<p class="has-text-align-center">*</p>


<p>Comments and suggestions welcome.</p>
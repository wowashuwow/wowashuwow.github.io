---
layout: post
title: Does MATLAB Work on M1 MacBooks?
image: '/images/fi-matlab-m1-macbooks.jpg'
description: MATLAB on M1 MacBooks has some issues
---
**Short answer**: Yes.

**Long answer**: It does, but the user experience is subpar.

Matlab does work on Apple’s M1 chip machines. There isn’t a native ARM version for it yet, but it runs using Rosetta 2. Rosetta 2 is Apple’s software that allows x86 applications (like Matlab) to run on the M1 ARM chip through emulation.

But while Matlab does work on my M1 MacBook Air, the user experience is subpar. The UI can be extremely slow to respond sometimes. Besides, when using the Control System Designer toolbox, I found that the UI behaves really weird. When I select a setting that requires me to enter parameters, Matlab opens up a new dialog box for it but it always switches to the wrong one. I have do a three finger swipe and enter task view to select the right one. It is also too much of a hassle to get “characteristics” on plots to stay in place — The labels suddenly disappear and sometimes just refuse to show up. These things waste a lot of time and are extremely inconvenient, especially when you’re working on long projects and tight deadlines.

I feel the M1 machines are great devices for creators. But if you are an engineering student who needs Matlab and other software such as Abaqus, Autodesk Inventor, etc., I would pick a Windows laptop over this one if it’s going to be your only device.

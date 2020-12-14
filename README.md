 # Log Parser UI
Web interface for Microsoft Log Parser.

## Introduction
[Log Parser](https://en.wikipedia.org/wiki/Logparser) is a widely used tool from Microsoft that enables parsing of log files from a variety of sources, including IIS web server.  This application provides a front end for the parser allowing you to view log entries based on user defined filters.

![Screenshot](screenshot.PNG)

## Setup
Install [Log Parser](https://www.microsoft.com/en-us/download/details.aspx?id=24659) using the provided installer.  In order for the web app to use the COM API it must first be registered using `regsvr32 LogParser.dll` and also have the correct NTFS permissions set.  Also ensure that the folder containing the log files, i.e. `C:\inetpub\logs\LogFiles\W3SVC1` has suitable permissions set.

If using IIS you will need to allow both `Load user profile` and  `Enable 32-Bit Applications` on the application pool.  In addition you should follow [instructions](http://toastergremlin.com/?p=543) to set permissions for your application pool identity in the COM Security tab of Component Services 

Finally change the appsettings.json file to include the path where the log files are located.

```JSON
"LogPath": "C:\\inetpub\\logs\\LogFiles\\W3SVC1"
```

## Credits

NReco Query Builder (jQuery plugin)
https://www.nrecosite.com/query_builder_js.aspx

Fluent Query Builder
https://github.com/BraspagDevelopers/fluent-query-builder

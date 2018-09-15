# sensubot-services
## API and services for sensubot

## RUNNING APP:
Run with "node app".

Run mongo server from mongo directory in seperate terminal with mongod command.

## DATABASE:
Must have Mongodb database name set at "sensudb".

sensudb has collections: Forms, Organizations, Questions.

Example Form document:
```
{    "_id" : ObjectId("598e08cfffe547612f9c2c92"),
    "name" : "Orlando Health Guarantor Financial Statement",
    "state" : [
        "florida",
        "fl"
    ],
    "city" : "orlando",
    "hospital" : [
        "orlando health",
        "orlando hospital",
        "orlando regional medical center",
        "orlando"
    ],
    "url" : "You appear to qualify for this form. Please print and fill out this form and return it to Orlando Health by mail, in person, or email to FinancialAssistance@orlandohealth.com. Please call (407)650-3800 if you have any questions. \n http://www.orlandohealth.com/~/media/files/5909-84281.pdf?la=en",
    "organization" : ObjectId("598e040affe547612f9c2c33")
}
```

Corresponding example Question document:
```
{
    "_id" : ObjectId("598e42faaa9d166c27fc73d3"),
    "saveto" : "hospital",
    "content" : "Which hospital are you seeking financial relief from?",
}
```

## CHANGES TO RUN IN PRODUCTION:

For emailservice.js functionality comment out lines 30 - 37, then uncomment lines 41 - 47 and fill the authentication data.

To connect to db at UCF, switch lines 18 and 19 in app.js

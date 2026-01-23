# Original Vision Prompt

> This document contains the original prompt that inspired the Amygdala platform. For the full technical specification, see [AMYGDALA_SPECIFICATION.md](./AMYGDALA_SPECIFICATION.md).

---

## The Vision

*Written by Martin Zahumensky, January 2026*

So my idea is to build Ataccama Data Trust platform concept of future. Current ataccama is mostly rules based data quality, some anomaly checks, detection of business terms, documenting data assets. Now my idea of next generation world is different. Data Quality issues are usually detected by humans looking on reports, humans are good at spotting anomalies when they know that specific data or report - they can look on revenue number and see it looks odd, they can look on chart and see a revenue from specific branch is missing, they can look on report and see data for yesterday are missing. This is what is making people say I dont trust my data, they look on it and spot anomalies or incorrect calculations. There are different reasons for this - it can be that the data from specific system has not arrived, or the data arrived but were incorrectly filtered and some portion did not made it to that file, or the input data arrived late, the data might need mapping during aggregation eg branch to city, city to state, state to country and these reference data might not be complete, it might be pipeline failed which is calculating the report. Usually tools like catalogs are documenting tables from source databases, trying to describe them, than documenting reports, and trying to calculate lineage how those were calculated. The problem is that it should go backwards it should go from reports down to data assets, this would give you the ability to describe much better how the source data are used and where, can give you usage statistics, and allow you to understand how the data are used down the stream. Observability is often focusing on pipelines failures not on content of data produced on pipelines, anomalies detection is often focused on specific tables, but that might not detect the issues. So fundamentally this concept we have now is not working end to end, and is only giving half the answers to users.

---

## The Agent Architecture

My vision of the world is:

### Agent 1: Documentarist (Cataloguer)

There will be an agent which would be looking on reporting system or consumer systems like salesforce. This agent would be documenting the reports, look on the logic how the report was calculated, analyse what were the input data, look what source tables are used to calculate these data, then look one step back and look how those data were calculated. As such he would document reports, than tables somewhere in golden layer, then silver, bronze. Along that he would collect key transformation scripts procedures. While doing this he would document each asset in catalog, but describe it based on the data in that table eg customer data but also add additional information such as how these data are used in what reports, what are the typical filters used eg where clauses, what are the typical aggregation used further down the stream. He would perform profiling of the tables and calculate basic characteristic such as min, max, distribution, data formats eg dd.mm.yyyy or yy.mm.dd is used in date column. All this will be stored in catalog, lets call this agent something like Documentarist or cataloguer or whatever is the best english word for this. If this agent detects new data source and he does not know who is the owner of this he should fire a task / issue to add the owner.

### Agent 2: Spotter

Second agent would be called Spotter - this spotter will be looking on the consumer facing systems or reports, his role will be to eg open report look on the report, spot anomalies, he should be expert on typical issues which are causing users to say - I dont believe in the data - some of the issues as examples I described above - he should look on timeseries charts check if today does have data, he should remember revenue values from last few days, and be able to detect anomaly eg revenue is growing daily by 100k usd now is 3milions, or it dropped by 2mio, he should look on typical data in distribution eg by branch and check the numbers, see if anything is missing. Once he spot anomaly he should fire alert - he should distinguish if this is low probability issues or high probability of serious issues. He should immediately create issue and assign issue to that asset. He should store somewhere snapshots of key data in the report so he can day to day compare if they look good.

### Agent 3: Debugger

Next agent would be called Debug or something like that - he should be looking on new issues, once issue is created he should go and try to debug the issues and find root cause, eg look on how that attribute is calculated, where is it coming from, check the table which is feeding it, does that table look alright, if yes go back to next table, does it look incorrect, see how that table is populated, check the pipeline which is populating it, if that pipeline is failed, try to restart it, if it fails again debug the issue and fix it, if it cant be fix, raise issue to appropriate owners of the pipeline with description of the issue. He might find reference data is missing, if the data looks legit eg new branch add it to reference table, restart job, create alert on the owner of that reference data to check it and add missing values or whatever is needed. This should work the same as claude code works when debugging software code - Look on issues, analyse logs, see whats the root cause, continue.

### Agent 4: Quality Agent

Quality agent - will be scanning the tables, he will look on profiling, write a script eg in python which can be run to validate the data and see if they conform to standard. His role is to understand the data asset based on data in catalog, and define appropriate rules which can indicate data is bad - eg him looking on this is used in Call center application he should be able to say that phone number is mandatory and needs to be in format which can be dialed. He should be able to say that loan value should be smaller than collateral value and so on - use intelligence of llm models to devise those rules. He than implements the script run validation, check the results, if the results are not good he should adjust the script so it works reliably and is giving correct results - this does not mean he wants all tests to pass eg when phone numbers do not conform format that is ok, but when eg he detects there are more formats of emails address then adjust the logic of the script. Then he should assign this script to that asset and run this on schedule or during his run to validate. If some issues are detecting he will weight the importance and create issues assign them to owners, he should also be smart to say if this can be auto-fixed eg by Transformations agent or, this needs to be corrected in source system, or this should be corrected in pipeline logic and assign the issue to appropriate team.

### Agent 5: Transformation Agent

Transformation agents - will be smart agent who can look on results of Quality agent and be able to say if the data can be adjusted / improved based on the feedback, or if the issues can be fixed. He should also help business users to adjust the data assets according their needs - eg they might ask I want to add new column which will only contain valid business addresses/excluding private emails, or I want to create new asset which will combine these two assets and give me the resulting table with these columns. Or want to merge these two assets based on company name with proximity matching, and give confidence of the merge. Or I want to exclude all invalid phone numbers. This agent will implement a script which will be able to calculate this asset and create new table in the main repository eg snowflake. He should be smart to ask users additional questions if its not clear what to do, show them the preview on few results, and then run the script.

### Agent 6: Trust Agent

Trust agent - will looking on catalog assets, and will look on different aspects of the data asset indicating if it is asset which can be trusted - he should be smart and considered all available metadata eg used in several govern reports which are used by many people, asset does have good documentation, have owner, asset does have good quality or its adjusted by transformation agent. Check current issues and see if there is any issue reported up the stream or down the stream, if yes should indicate currently the data might not be in good shape. His result would be star rating of the asset on trustability, and red/amber/green light on current fitness for use based on the issues currently detected / related to this issue, he should also provide short description of reasoning behind assigning those stars - eg saying heavily used, governed asset, with good quality and currently no issues detected. He can also take feedback from the users, eg if user will say something is wrong on this asset he should create issues, and the Spotter agent should be activated to analyse that asset, and fire debugger if needed.

---

## Agent Orchestration

Each of these agents will be running on schedule doing their work, some agents might fire other agents eg if spotter detects and create issue he can initiate debugger to analyse it.

Each agent should have his log on catalog page, giving his rating / summary - eg Quality saying - check the assets quality is 80% no new issues detected. Trust should return his trust index, etc.

---

## Application Vision

I envision this as modern application looking like ataccama UI on screenshots. The core part is agents management where you see all agents available. Each agent can be run from hand with instructions eg go check all assets, or go and look on report XYZ.

### Key Screens

1. **Agent Command Center** - Where you see all agents available, their status, and can run them manually
2. **Catalog Screen** - Where all assets are catalogued, marked by type (report, application screen, database table). Each asset shows results from agents (profiling, usage, quality, trust index, etc.) and has a log showing what each agent thinks about this asset
3. **Issues Screen** - Where any issues reported by any agents are logged and assigned to users

---

## Summary

This is roughly the vision of next gen truly agentic based data trust platform. The key insight is that **trust is evaluated at the consumer layer** (reports, applications), so the platform should work **top-down** - starting from what users see and tracing back to sources.

---

*This vision was used to create the [Amygdala Specification](./AMYGDALA_SPECIFICATION.md) and guides all implementation decisions.*

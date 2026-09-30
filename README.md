# Azure & Friends Meetup Voting

A small, live-updating panel-topic poll designed for Azure Static Web Apps. Visitors can vote from the home view or open `/?view=votes` to watch the results.

## Topics

- AI & Copilot
- Cloud-native apps
- Azure costs
- Security
- Developer experience

## Deploy to Azure

The Static Web Apps workflow deploys the site and the `api/` Azure Functions app. Create an Azure Storage account with Table Storage enabled, then add an application setting named `VOTES_STORAGE_CONNECTION_STRING` to the Static Web App with that storage account's connection string. The API creates its `MeetupVotes` table automatically on its first request.

The workflow deploys from the repository root and configures `api/` as the API location. The site and API use the same origin; no separate frontend configuration is needed.

## Run locally

Install and run Azure Functions Core Tools, set `VOTES_STORAGE_CONNECTION_STRING` in your local Functions settings, and start the Static Web Apps CLI with the repository root and `api/` as the API location. A local Azure Storage emulator such as Azurite can be used for development.

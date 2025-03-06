# Document Information Extractor and Builder

# Styles
Morden designs. 

Colors:
- Purple: #2f59cf
- deep Purple: #00185c
- light white: #f6f8fd

Font:
- These fonts are preferred, but using others are ok
- Titles: Fraktion Sans Variable,
- Text: Soehne

# Left Nav
- There is no header in the page
- There is a left nav in the page, always displayed to people
- There are these functions
    - Document Builder
    - Files Page
    - Field-Prompt Manager
    - Chat with Docs

# API

## Auth API
## Chat API
## Query API
- It's a OPENROUTER API call. It will take these parameters:
    - system prompt
    - user prompt
    - model name
    - max tokens
- default model will be: google/gemini-2.0-flash-001:online

# Storage
- Vercel Storage

# Database
- Subapase PostgresSQL

# Document Builder

## Document Management
- The platform should allow user to select uploaded docuemnts from the user, the page will display all docs upalod by the user and user should select which documents to use, if the user wnat to uplaod new documents it will forward user to the Files page.

## Field-prompt manager
- User can edit the fields-prompts, and they can save the config in this page as well
- User can load other field-prompts config

## Information Extraction
- The plaform allows the user to add, delete, modfil a kay value pairs like below
```
MANUFACTURER_NAME = "Provide the manufacturer name"
INDICATION_FOR_USE = "Write the indication for use for this device"
```
- It then for each pair there will be a button called "extract", after click that, we will run it using the exsting api/query using LLM to extract the inforamtion. and shows on the side of the row (as a long text, and editable, so people can review and change, a checkbox called "reviewed" for people to click to mark this field has been reviewed). The prompt box is also a long text box.
- There will be a extract ALL button
- We are uplaoding lots of medical device Instructions for Use (IFU) docuemnts, please create a 10 fake fields and prompts so we can run it through
- We will use the api/query to implement this. It will send all the docs information and the fields to be extraced to the API and get the extracted results out. 

# Files Page
- This will will show all the files users has uploaded before, ordered by timestamp
- Users are able to upload more files or remove files.
- Users can not edit the files, but can edit file name
- It will show the size of the file (Mb, GB, K etc)

# Field-Prompt Manager
- In the document builder page there are lots of field and prompts, and this page is the page to add, edit, remove it.
- The field-prompts can be stored as a json file for the user, called a config
- User can edit the field prompts and save or rename them, and can delete the config together as well
- User can choose between a normal view or a json file to edit the field-prompt pairs

# Chat with Docs
- In the Chat with Docs page, it's a chatting bot page
- You can select the docments you want to chat with
- We will use the api/query api
- We will send the text in the docs and the last 10 chat history to the API to get the response
- Use model google/gemini-2.0-flash-001
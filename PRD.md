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
    - Files Page
    - Document Builder
    - Field-Prompt Manager
    - Chat with Docs
    - Submission Checklist
    - Submission Checklist Config Manager
    - Compliance Checklist
    - Compliance Checklist Config Manager

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

## Document Building
- at the botton of the page, below the extraction section, is the document building section
- user can select ONE file from their files as the template. it's a docx file.
- Then the user click build the document, we will find all the "{{}}" in the docx files to repalce with the key values we extracted from the doc that showing above.
- After the is generated, the doc will automatically downloaded.
- Build a new API for this, called api/fill-document

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

# Submission Checklist
- Provides users a clear list of required documents for submission (e.g., UAF, IVF, safety manuals, introduction documents).
- Allows associating one or multiple uploaded documents to each checklist item.
- For each row, there is the checklist name, and the requirement
- Run LLM model using the selected documents againt the model, and output status indicators (e.g., compliant, non-compliant, needs review) for easy tracking and user feedback, also a comments section why the model think this way
- Integration with Files Page for seamless document management.

# Submission Checklist Config Manager
- Interface for administrators or advanced users to create, edit, and manage submission checklist configurations.
- Supports customization of required documents and checklist criteria per project or compliance need.
- Enables saving, loading, and deleting checklist configurations stored as JSON.
- Allows sharing configurations across multiple users or keeping them personal/private.
- Offers JSON-based direct editing alongside a more user-friendly, structured editor.

# Compliance Checklist
- Implements the GSPR Compliance Matrix, allowing systematic cross-referencing of multiple checklist items against numerous uploaded documents.
- User are select multile documents at the top, and the check will run agains all the docuemnts
- Use api/query to check whether it meets or notrelevant information across all selected documents.
- Provides detailed compliance statuses (fully compliant, partially compliant, non-compliant) based on the cross-document analysis.
- Highlights specific documents contributing to compliance or indicating missing elements.
- Features comprehensive reporting to assist users in pinpointing gaps and necessary actions.
- The config include fields: Serial, General Requirement, Applied Standards (like EN ISO 13485:2016/A11:2021), apply documents (SO 13485 Certificate Quality Manual, Design & Development File/Design History File Medical Device File/Device Master Record Risk Management Report Performance Evaluation Report) and Compliance Criteria. The output from the model will be Comply (Y/N/NA), and comments.

# Compliance Checklist Config Manager
- Allows configuration and management of compliance checklists (e.g., IVDR/GSPR) with granular control over checklist items.
- Supports bulk editing, importing, and exporting checklist configurations.
- Includes version control capabilities for audit trail purposes and historical compliance tracking.
- Offers both visual and JSON editing interfaces for efficient management and advanced customization.
- Facilitates shared checklist configurations for consistent compliance assessments across teams and projects.


# ChatGPT Bulk Delete - Tampermonkey Script (Firefox)

A Tampermonkey userscript for bulk deleting ChatGPT conversations in Firefox.

## Description

This script adds bulk delete functionality to ChatGPT's conversation history. It works with the ChatGPT 2025 UI using the `#history` container.

## Features

- **Backend API deletion**: Uses ChatGPT's backend API for reliable, fast deletion (no UI clicking required)
- **Checkbox selection**: Click checkboxes to select conversations for deletion
- **Bulk delete**: Delete multiple conversations with a single click
- **Visual feedback**: Real-time progress indicators and error highlighting
- **Notifications**: Desktop notifications for deletion status
- **Works with ChatGPT 2026 UI**: Compatible with the latest ChatGPT interface + New, modern look!

## Installation

1. Install [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) extension for Firefox
2. Open Tampermonkey dashboard
3. Create a new script
4. Copy and paste the contents of `GPTbulkDelete.ts` into the editor
5. Save the script

## Usage

1. Navigate to [ChatGPT](https://chatgpt.com/) and ensure you're logged in
2. Open your conversation history sidebar
3. Checkboxes will appear next to each conversation
4. Click the checkboxes next to the conversations you want to delete
5. Click the "Bulk Delete Selected" button at the top
6. Confirm the deletion
7. Watch the progress as conversations are deleted via the backend API
8. You'll receive a notification showing how many were successfully deleted

## Version History

**6.0.0** - Major update:
- Button now uses your ChatGPT site preferred color
- Checkboxes now look cooler TODO: Make them inline with chat name
- Deletion now works much faster
- Notifications now appear under the button, not through browser's function

**5.0.0** - Major update:
- Uses backend API for deletion (more reliable and faster)
- Improved error handling and notifications
- Better UI feedback during deletion process

**4.0.0** - Updated for ChatGPT 2025 UI using #history container


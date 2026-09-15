# KohaTour

Koha plugin for guided tours in the staff interface. Library staff and trainers define tours via a JSON configuration directly in the browser - no programming skills required.

## Features

- **Tour banner** on every staff page that has a tour configured
- **JSON configuration** in the plugin admin (CodeMirror editor with live validation)
- **CSS selector targeting** - target elements are identified via "Copy selector" from the browser DevTools
- **Graceful handling of missing elements** - steps targeting elements not visible to the current user (e.g. due to permissions) are shown as placeholders so the tour continues
- **Automatic URL linking** - URLs in step titles and descriptions are automatically converted to clickable links
- **"Don't ask again"** - users can permanently dismiss the banner per page (localStorage); admins can reset this globally
- **Export/Import** - download and upload configuration as a JSON file
- **Fully customizable texts** - all UI strings (banner, tour buttons, placeholder text) are part of the JSON configuration

## Installation

Upload the plugin as a `.kpz` file via Koha's plugin management:

> Koha - Administration - Plugins - Upload plugin

Minimum Koha version: **22.11**

### Building the kpz from Git

From the repository root:

```bash
git archive --output=KohaTour.kpz --format=zip HEAD -- Koha
```

## Configuration

After installation: Plugins - KohaTour - Configure.

The JSON editor ships with a default configuration including example tours. Structure:

```json
{
  "banner": {
    "notification": "A guided tour is available for this page. Would you like to start it?",
    "yes": "Yes, please.",
    "no": "No, thanks.",
    "donotask": "Do not ask again.",
    "nextBtn": "Next",
    "prevBtn": "Previous",
    "doneBtn": "Done",
    "stepNotAvailable": "This step is not available in your current view."
  },
  "tours": [
    {
      "path": "/cgi-bin/koha/mainpage.pl",
      "name": "Koha home page",
      "steps": [
        {
          "selector": "#navmenulist",
          "title": "Main navigation",
          "body": "Description text for this element."
        }
      ]
    }
  ]
}
```

### Banner texts

| Field | Description |
|---|---|
| `notification` | Message shown in the banner |
| `yes` | Label for the start button |
| `no` | Label for the dismiss button |
| `donotask` | Label for the permanent dismiss link |
| `nextBtn` | "Next" button during the tour |
| `prevBtn` | "Previous" button during the tour |
| `doneBtn` | "Done" button on the last step |
| `stepNotAvailable` | Placeholder text shown when an element is not visible for the current user |

### Tour fields

| Field | Description |
|---|---|
| `path` | URL path of the target page (exact match against `window.location.pathname`) |
| `name` | Display name of the tour (used in the configuration) |
| `selector` | CSS selector targeting the element (via DevTools - Copy selector) |
| `title` | Heading of the tour step (URLs are automatically converted to links) |
| `body` | Description text of the tour step (URLs are automatically converted to links) |

### Finding the CSS selector

1. Open the target page in the browser
2. Right-click the desired element - **Inspect**
3. In the DevTools panel: right-click the highlighted HTML tag - **Copy** - **Copy selector**
4. Paste the selector into the configuration under `"selector"`

### Finding the page path

Open the target page, press **F12**, switch to the **Console** tab, and type:

```
window.location.pathname
```

The output (e.g. `/cgi-bin/koha/mainpage.pl`) is the value to use in the `"path"` field.

### Important notes

- **Back up your configuration regularly.** Use "Download configuration" before making changes or updating the plugin.
- **Disable instead of uninstall.** Uninstalling the plugin deletes the stored configuration. Set the plugin to "Disabled" instead.
- **JSON validation.** The status bar below the editor shows whether the JSON syntax is valid. The Save button is disabled when there are errors.
- **Console diagnostics.** When a tour does not start or steps are missing, open the browser console (F12) and look for messages with the `[KohaTour]` prefix. They show which selectors were found, which are missing, and how to fix them.

## Architecture

```
Koha/Plugin/Com/MarkusMajer/
    KohaTour.pm              # Plugin main module
    KohaTour/
        tour.json            # Default configuration (loaded on install)
        js/tour.js           # Client-side tour runner (inlined by KohaTour.pm)
        templates/
            configure.tt     # Configuration page (CodeMirror editor)
```

### KohaTour.pm

- **`intranet_js`** - reads `tour.js` from disk and injects it inline on every staff page, together with driver.js (CDN) and the tour configuration as a JS object (`window.KOHA_TOUR_CONFIG`)
- **`configure`** - configuration page: save JSON, reset to default, globally reset "don't ask again"
- **`install`** - loads the default configuration from `tour.json` into the database

### tour.js

Runs on every staff page. Compares `window.location.pathname` against configured paths. On match, a banner is displayed with texts from the `banner` object in the configuration. Uses [driver.js](https://driverjs.com/) for the tour overlay with CSS selector resolution. Steps targeting elements not found on the page (e.g. due to user permissions) are shown as centered placeholder popovers so the tour can continue. URLs in step texts are automatically converted to clickable links (`target="_blank"`). Detailed diagnostic messages are logged to the browser console (`[KohaTour]` prefix) to help with troubleshooting.

The "don't ask again" state is stored per path in `localStorage` (`koha_tour_never_` + Base64 of the path). A server-side reset token allows admins to globally invalidate all browsers.

### configure.tt

CodeMirror JSON editor with live validation, dirty tracking, download/upload, and reset-to-default. Uses Koha's built-in CodeMirror library.

## Dependencies

- **driver.js 1.3.1** (CDN) - tour overlay library
- **CodeMirror** (bundled with Koha) - JSON editor in the configuration page

## License

GPL v3 or later (same as Koha)

# KohaTour

Koha plugin for guided tours in the staff interface. Library staff and trainers define tours via a JSON configuration directly in the browser - no programming skills required.

## Features

- **Tour banner** on every staff page that has a tour configured
- **JSON configuration** in the plugin admin (CodeMirror editor with live validation)
- **CSS selector targeting** - target elements are identified via "Copy selector" from the browser DevTools
- **"Don't ask again"** - users can permanently dismiss the banner per page (localStorage); admins can reset this globally
- **Export/Import** - download and upload configuration as a JSON file
- **Fully customizable texts** - all UI strings (banner, tour buttons) are part of the JSON configuration

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
    "doneBtn": "Done"
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
| `title` | Heading of the tour step |
| `body` | Description text of the tour step |

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

Runs on every staff page. Compares `window.location.pathname` against configured paths. On match, a banner is displayed with texts from the `banner` object in the configuration. Uses [driver.js](https://driverjs.com/) for the tour overlay with CSS selector resolution.

The "don't ask again" state is stored per path in `localStorage` (`koha_tour_never_` + Base64 of the path). A server-side reset token allows admins to globally invalidate all browsers.

### configure.tt

CodeMirror JSON editor with live validation, dirty tracking, download/upload, and reset-to-default. Uses Koha's built-in CodeMirror library.

## Dependencies

- **driver.js 1.3.1** (CDN) - tour overlay library
- **CodeMirror** (bundled with Koha) - JSON editor in the configuration page

## License

GPL v3 or later (same as Koha)

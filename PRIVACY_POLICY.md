# Privacy Policy for xb

Effective date: August 4, 2026

xb is a browser extension for Weibo that helps users reduce timeline noise, improve readability, and enjoy a clean reading experience.

This Privacy Policy explains what information xb processes, how that information is used, and what choices users have.

## Scope

This Privacy Policy applies to the xb browser extension and its current core features, including:

- hiding distractions such as promoted content, stickers, and ads, with optional controls for supertopic content
- improving reading flow through page enhancements
- making supporting requests to Weibo-owned endpoints such as `m.weibo.cn` for specific features
- loading and downloading media from permitted Weibo media CDN hosts
- optionally using xb rating when the user enables it
- optionally loading user-selected open-source fonts from a public font CDN (`cdn.jsdelivr.net`) when the user enables a downloadable font in settings
- saving extension preferences locally in the browser

## Information xb Processes

xb processes content from Weibo pages on `weibo.com` and `www.weibo.com` to provide the extension's user-facing features. Some features may also request related Weibo-owned endpoints such as `m.weibo.cn` and permitted media CDN hosts.

This may include:

- timeline and feed content needed to hide, expand, or reorganize visible page elements
- profile and status page content needed to improve layout and readability
- extension settings such as appearance preferences and feature toggles
- the current Weibo account UID, target account UID, and selected star rating when xb rating is enabled
- the `XSRF-TOKEN` cookie from `m.weibo.cn` when a supported Weibo request requires it

## How Information Is Used

xb uses processed information only to provide the extension's core functionality, including:

- modifying the appearance and behavior of Weibo pages at the user's request
- hiding ads, stickers, optional supertopic surfaces, and other distracting elements
- storing user preferences so the extension can remember settings between sessions

xb does not use processed information for advertising, profiling, or unrelated analytics.

## Data Storage

xb stores user settings locally in the browser using the browser's extension storage (`chrome.storage`). Browsing history entries and the video volume preference are stored locally using `localStorage`.

When xb rating is enabled, the rating service receives the current Weibo account UID in request headers. Rating requests may also include target account UIDs and the selected star rating. The service uses this information to return rating summaries, remember the current user's rating, and aggregate submitted ratings.

Core extension features are designed to process page content locally in the user's browser. xb does not sell user data.

## Network Access

xb runs on Weibo pages and uses network access only for extension features.

Most page content processing happens locally in your browser. The extension may request Weibo, `m.weibo.cn`, and permitted Weibo media CDN endpoints to provide reading, topic/search, notification, and media download features. For supported `m.weibo.cn` requests, xb reads the site's `XSRF-TOKEN` cookie and includes Weibo credentials only in requests sent back to `m.weibo.cn`.

For media downloads, xb may adjust the `Referer` and `Origin` request headers for permitted Weibo media CDN requests by using the browser's `declarativeNetRequest` API. This does not send those headers or media data to xb-server.

Some appearance settings let users load open-source fonts hosted on `cdn.jsdelivr.net`. Those requests happen only when the user selects a downloadable font; system fonts do not contact that CDN.

xb rating is optional and disabled by default. When enabled, xb contacts the configured xb-server to fetch or submit rating data. Requests include the current Weibo account UID and may include target account UIDs and a selected star rating. Users can disable rating in the extension settings at any time.

## Data Sharing

xb does not sell personal information or website content to third parties.

xb does not transfer processed information for purposes unrelated to the extension's core functionality.

## User Choice and Control

Users can control xb by:

- enabling or disabling extension features
- changing or removing stored preferences
- uninstalling the extension at any time

Removing the extension will stop all further local processing by xb. Users may also clear extension data through the browser's extension management tools.

## Security

xb is designed to keep its data footprint limited to what is necessary to provide the requested functionality. However, no software or storage mechanism can guarantee absolute security.

## Changes to This Privacy Policy

This Privacy Policy may be updated from time to time to reflect changes in the extension's functionality, legal requirements, or operational practices. The latest version should be published at the same public URL used in the Chrome Web Store listing.

## Contact

If you have questions about this Privacy Policy, contact the publisher through the contact method listed in the xb Chrome Web Store listing or project repository.

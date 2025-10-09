# Changelog

All notable changes to the Journal App project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [M3.5] - Theme System - 2024-12-10

### Added
- System/Light/Dark theme selector in Settings page with three-mode toggle (系统/浅色/深色)
- Theme persistence using localforage + localStorage for fast initial load
- FOUC (Flash of Unstyled Content) prevention with inline blocking script in layout head
- Comprehensive dark mode styles for all components:
  - TipTap rich text editor (prose styles)
  - Security lock screen and biometric setup
  - Settings page UI
  - All form controls and buttons
- ThemeContext provider for global theme state management
- System theme auto-detection using `prefers-color-scheme` media query
- E2E test suite covering theme functionality (14 passing tests):
  - Default system theme behavior
  - Light/dark theme persistence across reloads
  - Smooth theme switching
  - Icon visibility verification
  - No-flash on page load validation

### Fixed
- TipTap editor SSR hydration mismatch error by adding `immediatelyRender: false` configuration
- TypeScript type compatibility issues with Web Crypto API (BufferSource types)
- WebAuthn API migration from deprecated `publicKey` property to `getPublicKey()` method
- useRef hook initialization in SecurityContext and EntryEditor (explicit undefined values)
- Theme application timing to prevent white flash during page load

### Changed
- `app/layout.tsx`: Integrated ThemeProvider wrapper and inline theme initialization script
- `features/journal/EntryEditor.tsx`: Configured TipTap editor for SSR compatibility
- `styles/globals.css`: Added CSS custom properties for dark mode theming
- Test organization: Moved lock screen theme tests to lock.spec.ts for better separation

### Technical Details
- Theme preference storage key: `journal-theme-preference`
- Supported modes: `'light'`, `'dark'`, `'system'`
- Dark mode implementation: Tailwind `class` strategy
- No external theme libraries used (pure React Context + CSS variables)

---

## [M3] - Security Features - 2024-12-08

### Added
- End-to-end encryption for journal entries using AES-GCM
- PBKDF2-based key derivation with 100,000 iterations
- 6-digit PIN code lock screen with auto-lock after 30s inactivity
- Biometric authentication support (Touch ID/Face ID/Windows Hello) via WebAuthn
- Secure password/PIN strength validation
- IndexedDB storage encryption via localforage
- Privacy mode with automatic screen locking

### Security
- All sensitive data encrypted at rest
- Master key never stored in plaintext
- Salt and IV generated per encryption operation
- Secure credential storage for biometric authentication

---

## [M2] - Media Support - 2024-12-05

### Added
- Photo attachment support for journal entries
- Client-side image compression (max 1920x1920, 80% quality)
- Image format validation (JPEG, PNG, WebP)
- File size limit: 10MB before compression
- Preview URL management with proper cleanup
- Upload progress indicator
- Photo removal functionality

### Technical Details
- Image storage via Blob API in IndexedDB
- Compression library: Browser-native Canvas API
- Supported formats: image/jpeg, image/png, image/webp

---

## [M1] - Rich Text Editor - 2024-12-03

### Added
- TipTap rich text editor integration
- Text formatting: Bold, Italic, Underline, Strikethrough
- List support: Bullet lists, Ordered lists
- Auto-save functionality with 500ms debounce
- Manual save option
- Last saved timestamp display
- Mood selector component (😊 😐 😢 😠 😌)

---

## [M0] - Foundation - 2024-12-01

### Added
- Next.js 14 App Router setup with TypeScript
- Tailwind CSS styling configuration
- Basic layout structure with navigation
- Home page with "New Entry" button
- Settings page placeholder
- localforage integration for client-side storage
- Entry model: id, createdAt, updatedAt, html, mood, photo
- Storage service: CRUD operations for journal entries

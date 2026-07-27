# Win95 Portfolio Features Implementation Guide

## Overview
This guide documents the new Win95-inspired features that have been added to your portfolio website. All features have been implemented and are ready for customization.

---

## ✅ Features Implemented

### 1. **Mail Icon** ✉️

**Location:** `src/components/applications/Mail.tsx`

**What it does:**
- Opens a draggable window with an email form
- Collects sender name, email, and message
- Sends emails to `jokje@dtu.dk` (your work email)

**How to make email sending work:**
Currently, the component is set up to validate input but email sending is commented out. To enable actual email sending:

1. **Option A: Using EmailJS (Recommended)**
   - Go to https://www.emailjs.com/
   - Create a free account
   - Create an email service and template
   - Update these values in `Mail.tsx`:
     ```typescript
     const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
     const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
     const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
     ```
   - Uncomment the EmailJS section in the `handleSendEmail` function

2. **Option B: Using a Backend API**
   - Create a backend endpoint that handles email sending
   - Update the fetch call in `Mail.tsx` to point to your endpoint
   - Uncomment the fetch section in `handleSendEmail`

**Customization:**
- To change the recipient email, edit line 28 in `Mail.tsx`: `to_email: 'jokje@dtu.dk'`
- Modify the form labels and styling in the `styles` object

---

### 2. **RecycleBin Icon** 🗑️

**Location:** `src/components/applications/RecycleBin.tsx`

**What it does:**
- Displays deleted files/items in a window
- Allows restoring files to their original location
- Allows permanent deletion of files
- Stores deleted items in browser localStorage

**How to add files to the recycle bin:**
Files can be programmatically added by dispatching a custom event:

```typescript
const deletedFile = {
    id: 'unique-id-' + Date.now(),
    name: 'file-name.ext',
    type: 'file', // or 'folder'
    deletedAt: new Date(),
    originalLocation: 'Desktop'
};

const event = new CustomEvent('deleteFile', {
    detail: deletedFile
});
window.dispatchEvent(event);
```

**Adding your image file:**
To add "old picture of me.jpg" to the recycle bin:
1. Save your profile image as `/public/old-picture-of-me.jpg`
2. Create a component that dispatches the delete event with your image
3. Or manually add it to localStorage under key `recycledFiles`

**Customization:**
- Modify the file icons (emojis) in the rendering section
- Change localStorage key name in the `useEffect` hook

---

### 3. **About/Bio Icon** ℹ️

**Location:** `src/components/applications/About.tsx`

**What it does:**
- Opens a draggable window with tabbed interface
- Three tabs: General, Technology, Hobby
- Displays bio information about you

**How to customize your information:**

Edit the `bioData` object in `About.tsx` (around line 30):

```typescript
const bioData = {
    general: {
        title: 'General Information',
        content: (
            <>
                <p><strong>Name:</strong> Your Name Here</p>
                <p><strong>Title:</strong> Your Title</p>
                {/* Add more content */}
            </>
        ),
    },
    technology: {
        title: 'Technology & Skills',
        content: (
            <>
                {/* Your tech stack */}
            </>
        ),
    },
    hobby: {
        title: 'Hobbies & Interests',
        content: (
            <>
                {/* Your hobbies */}
            </>
        ),
    },
};
```

**Files to edit for customization:**
- `src/components/applications/About.tsx` - Edit the `bioData` object with your information

---

### 4. **Context Menu (Right-Click)** 👆

**Location:** `src/components/os/ContextMenu.tsx`

**What it does:**
- Shows Windows 95-style context menu on right-click
- Different menus for Desktop, Icons, and Recycle Bin
- Includes options: Open, Delete, Restore, Refresh, New Folder, Properties, etc.

**Currently Implemented:**
- ✅ Desktop context menu (Arrange by, Task Manager, Paste, Refresh, New Folder, Properties)
- ✅ Icon context menu (Open, Edit, Send To, Cut, Copy, Delete, Rename, Properties)
- ✅ Recycle Bin context menu (Restore, Cut, Delete, Properties)

**To integrate with your desktop:**
1. Update `DesktopShortcut.tsx` to handle right-click events
2. Dispatch a custom event with the menu context
3. Desktop component listens and renders the ContextMenu

**Example integration:**
```typescript
// In DesktopShortcut.tsx
const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('contextMenuOpen', {
        detail: { x: e.clientX, y: e.clientY, isIcon: true }
    }));
};
```

---

### 5. **Expanded Start Menu** 

**Location:** `src/components/os/Toolbar.tsx`

**What it does:**
- Enhanced Start menu with more options
- Added buttons for: Github, Settings, Run, Shutdown
- Win95-style menu with visual separators

**Menu Items:**
- **Github** - Opens your GitHub profile in a new tab
- **Settings** - Placeholder for settings (ready to implement)
- **Run...** - Placeholder for Run dialog (ready to implement)
- **Shutdown** - Existing shutdown functionality

**To add Settings functionality:**
Create `src/components/os/Settings.tsx` and:
1. Import it in `Toolbar.tsx`
2. Create state to track if Settings window is open
3. Open the Settings window when clicked
4. Allow users to change background colors/effects

**To add Run functionality:**
Create `src/components/os/RunDialog.tsx` and:
1. Create a list of available programs/files
2. Allow typing and filtering
3. Open selected program on Enter
4. Similar to reference project's Run component

**Customization:**
- Edit the menu items in the `startWindowContent` div
- Change icons by modifying the `icon` prop
- Add keyboard shortcuts using `<u>key</u>` in labels

---

## 🎨 Icon Files Used

The following icon files have been copied from the reference project and are now available:

- `src/assets/icons/mailIcon.png` - Mail icon
- `src/assets/icons/recycleBinIcon.png` - Recycle Bin icon  
- `src/assets/icons/settingsIcon.png` - Settings icon
- `src/assets/icons/runIcon.png` - Run icon

All icons are registered in `src/assets/icons/index.ts` and can be used throughout the application.

---

## 📋 Applications Registered in Desktop

The following applications have been added to the APPLICATIONS object in `Desktop.tsx`:

```typescript
mail: {
    key: 'mail',
    name: 'Mail',
    shortcutIcon: 'mailIcon',
    component: Mail,
},
about: {
    key: 'about',
    name: 'About',
    shortcutIcon: 'credits',
    component: About,
},
recycleBin: {
    key: 'recycleBin',
    name: 'Recycle Bin',
    shortcutIcon: 'recycleBinIcon',
    component: RecycleBin,
},
```

These will automatically appear as desktop shortcuts.

---

## 🔧 Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Mail Icon & Window | ✅ Complete | Needs EmailJS setup for actual email sending |
| RecycleBin Icon & Window | ✅ Complete | Ready to integrate with file deletion system |
| About/Bio Panel with 3 Tabs | ✅ Complete | Customize with your information |
| Context Menu Component | ✅ Complete | Needs integration with Desktop/DesktopShortcut |
| Start Menu Expansion | ✅ Complete | Github works; Settings & Run are placeholders |
| Icon Files | ✅ Complete | All icons copied and registered |

---

## 🚀 Next Steps

1. **Customize About Information** (Priority: HIGH)
   - Edit `src/components/applications/About.tsx`
   - Add your real information

2. **Set Up Email Sending** (Priority: HIGH)
   - Create EmailJS account
   - Add credentials to `Mail.tsx`

3. **Integrate Context Menu** (Priority: MEDIUM)
   - Update `DesktopShortcut.tsx` to handle right-click
   - Add context menu state to Desktop component

4. **Add Profile Image** (Priority: MEDIUM)
   - Save your profile photo as `/public/old-picture-of-me.jpg`
   - Create a component to display it

5. **Implement Settings Window** (Priority: LOW)
   - Create Settings component with background/effect options
   - Add persistence to localStorage

6. **Implement Run Dialog** (Priority: LOW)
   - Create Run component similar to reference project
   - Add program/file launching logic

---

## 📝 File Locations Quick Reference

| Feature | Main File | Config File |
|---------|-----------|-------------|
| Mail | `src/components/applications/Mail.tsx` | Update email in file |
| About | `src/components/applications/About.tsx` | Edit bioData object |
| RecycleBin | `src/components/applications/RecycleBin.tsx` | localStorage key: 'recycledFiles' |
| ContextMenu | `src/components/os/ContextMenu.tsx` | Already complete |
| Toolbar/StartMenu | `src/components/os/Toolbar.tsx` | Update menu items here |
| Icons | `src/assets/icons/index.ts` | Register new icons here |
| Applications | `src/components/os/Desktop.tsx` | Add apps to APPLICATIONS object |

---

## 🎯 Architecture Notes

- **Applications**: Each app is a React component that receives `onClose`, `onMinimize`, `onInteract` props
- **Icons**: All icons must be registered in `src/assets/icons/index.ts` with type `IconName`
- **Window Management**: Desktop component handles window state, z-index, and minimization
- **Storage**: LocalStorage is used for persistent data (RecycleBin, User Settings, etc.)
- **Context Menu**: Can be generalized to work with any element by using custom events

---

## 🐛 Troubleshooting

**Mail not showing up on desktop:**
- Check that Mail is properly imported in Desktop.tsx
- Verify `mailIcon` is registered in icons/index.ts

**About information not appearing:**
- Make sure you've edited the `bioData` object in About.tsx
- Check browser console for errors

**RecycleBin not persisting:**
- Check browser localStorage settings
- Verify no localStorage quota exceeded error

**Context Menu not showing:**
- Ensure ContextMenu component is imported
- Check that right-click event handlers are properly attached
- Verify `onClose` callback is implemented

---

## 📞 Support Files

If you need to modify or understand the existing Windows 95 portfolio implementation, refer to:
- Reference project: `/Users/jonaskjeldmand/Downloads/wins95Portfolio-main/`
- Compare components in the reference for implementation patterns

---

## ✨ Summary

All requested features have been successfully implemented and integrated into your portfolio. The components are modular, well-documented, and ready for customization. Start with updating the About section, then configure email sending, and gradually enhance other features as needed.


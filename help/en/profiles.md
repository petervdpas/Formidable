---
id: "profiles"
title: "User Profiles"
order: 3
---

## User Profiles

Formidable supports multiple **user profiles**, each stored as a separate `.json` configuration file.  
Profiles allow you to customize the environment per user or use case (e.g. author info, theme, context folder).

---

### Creating a Profile

1. Open **`Config ⇨ Switch Profile...`** from the main menu.  
2. Enter a new profile name such as `jack.json` (always include the `.json` extension).  
3. Click **Create**.

![Create New Profile](images/profile-switch-new.png)

> Once created, the new profile is immediately active. You can then configure it through the [Settings](#settings).

---

### Switching Profiles

To change between existing profiles:

1. Open **`Config ⇨ Switch Profile...`**.  
2. Click on the profile you want to activate.

The app instantly reloads with that profile’s configuration.

![Choose Profile](images/profile-switch-added.png)

> 💡 The profile list shows the configured **Author Name**. If not set, it defaults to `unknown`.

---

### Editing Profile Settings

After switching, open **`Config ⇨ Settings...`** to edit details for the active profile.

The active profile filename (e.g. `peter.json`) is always shown at the top of the Settings window:

![Edit Profile Settings](images/profile-switch-edit-settings.png)

You can configure, for example:

- Author name and email  
- Language preference  
- Dark mode, icons, or display options  
- Git, logging, or plugin settings  

All changes are saved back into the active profile file.

---

### Profile Files

- Profiles are stored as `.json` files inside the `config/` folder of your app.  
- They can be backed up, shared, or version-controlled with Git.  
- Common examples: `user.json`, `jack.json`, `peter.json`.

---

### Related Topics

- [Settings](#settings)  
- [Templates](#templates)

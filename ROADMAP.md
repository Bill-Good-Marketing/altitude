# NOTES (FIX AND UPDATE)

## Overall Goals
- **Progressive & Responsive:**  
  AltitudeV2 should be significantly more progressive and responsive than AltitudeV1, especially on smaller screens (below 390/360px in width).

## Authentication
- **Login / Sign-up:**  
  Implement robust authentication with potential Single Sign-On (SSO) options:
  - Google SSO
  - Microsoft SSO
  - Traditional Email/Password

## Key UI/UX Focus Areas (Responsive Design)
- Ensure the interface works seamlessly on mobile devices (screen widths below 390/360px).

## Navigation & Menus
- **Dropdown Menu:**
  - Must include a loading indicator when fetching data.
  - Should navigate to the correct route upon click.
  - The close icon functionality must work consistently across all devices.
- **Navbar:**
  - Should include the company logo, search box, and dropdown menus.
  - Needs improvements in responsiveness and clarity.

## Page-Specific Improvements

### 1. Main Dashboard
- **Grid Gap:**  
  Fix spacing issues in the grid layout.
- **Titles:**  
  Reduce font size for dashboard titles to improve readability and layout.

### 2. Contacts
- Review the container and flex layout for the Contacts page; adjust spacing and alignment as necessary.

### 3. Activities
- Ensure the container and flex layouts are consistent and responsive.

### 4. Calendar
- **Event Type Flex:**  
  Fix the flex spacing for event types.
- **Horizontal Scrolling:**  
  Add support for horizontal scrolling if content overflows.
- Consider adding additional day-specific features (e.g., quick view for events or appointments).

### 5. Personal Service
- Develop a dedicated, authenticated `page.tsx` for Personal Service.

### 6. Sales Pipeline
- **Navbar:**  
  Reuse/improve the navbar (logo, search, dropdown) similar to the main navigation.
- **Grid Gap & Title:**  
  Adjust grid spacing and reduce title font sizes for better layout.

### 7. Marketing
- Implement an authenticated `page.tsx` dedicated to Marketing functions.

### 8. Document Manager
- Create an authenticated `page.tsx` for managing documents.

### 9. Settings
- Enhance settings with additional features.
- Improve responsiveness and incorporate more progressive design elements.

## Additional / Potential Enhancements
- **Sidebar User Profile:**  
  Consider adding a sidebar that displays user profile information for a more personalized experience.

---

**Next Steps:**
1. Prioritize tasks by page or component.
2. Create mockups or wireframes for the responsive redesign.
3. Implement authentication updates and test across devices.
4. Ensure all layout changes (grid gaps, flex issues, font sizes) are responsive and tested on small screen devices.
5. Review and update styling for progressive interactions (loading indicators, smooth transitions, etc.).


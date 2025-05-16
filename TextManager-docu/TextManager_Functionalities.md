# TextManager.js Functionality List

## Core Management
- Text element creation and manipulation
- Integration with ComicCreator instance
- State tracking of selected text boxes
- Default settings management
- Custom styles management
- Settings persistence (localStorage)

## Text Bubble Creation & Manipulation
### Basic Creation
- Add text to panels
- Add text to canvas
- Unique ID generation
- Initial positioning
- Dimension settings
- Z-index management

### UI Elements
- Drag handle
- Resize handle
- Format text button
- Delete text button
- Text content container

### Interactive Features
- Draggable functionality
- Resizable functionality
- Selection handling
- Edge/padding click detection

## Selection & Properties
### Selection Management
- Text box selection
- Panel deselection
- Sticker deselection
- Properties panel visibility
- Section visibility control

### Property Controls
- Bubble style selection
- Font family selection (with categorized previews)
- Font size control
- Text color picker
- Bubble color picker
- Text style buttons
- Rotation control
- Event listener management
- Hex color input handling
- Slider value editing

## Advanced Formatting
### Popup Management
- Popup creation and positioning
- Section organization
- Close handling
- Outside click detection

### Style Sections
1. Custom Styles
   - Style grid display
   - Save current style
   - Set as default
   
2. Bubble Style
   - Show/hide bubble toggle
   - Bubble type selection
   - Visual previews

3. Bubble Tail
   - Position selection
   - Color control
   - Speech tail settings
     * Length
     * Width
     * Inset
     * Shear
     * Outline toggle
   - Thought tail settings
     * Inset
     * Circle count
     * Radius
     * Spacing
     * Offset

4. Text Style
   - Font controls
   - Size control
   - Line spacing
   - Style buttons
   - Alignment
   - Color management

5. Effects
   - Text outline
   - Text shadow
   - Opacity control

6. Position
   - Grid alignment
   - Rotation control

## Styling & SVG Features
### Text Effects
- Outline application/removal
- Shadow application/removal
- Rotation handling

### SVG Generation
- Speech bubble tail creation
- Thought bubble tail creation
- Tail settings management
- Dynamic SVG positioning

### Positioning
- 9-point grid positioning
- Percentage-based alignment
- Transform management
- Position grid reset

### Style Helpers
- Rotation value extraction
- Outline thickness/color
- Shadow color/offset
- Background color management

## State Management
### Save Operations
- Panel text state saving
- Canvas text state saving
- Style state extraction
- Position data preservation

### Load Operations
- Text state restoration
- Bubble recreation
- Style application
- Position restoration
- Event listener reattachment

### Position Finalization
- Exact positioning
- Transform preservation
- Export-specific adjustments

## Custom Styles
### Style Management
- Style creation
- Style application
- Style deletion
- Default style setting

### UI Generation
- Style preview generation
- Preview grid layout
- Delete button handling
- Style application handling

## Event Handling
- Delete operation management
- State saving triggers
- History management
- Drag and drop coordination

## Integration Points
- ComicCreator integration
- History manager integration
- Drag and drop manager integration
- UI manager integration
- Utils integration

## Special Features
- Export mode handling
- Line break management
- Color conversion utilities
- Position grid management
- Notification system integration

## Export Mode Features
### Style Preservation
- Exact font metrics preservation
- Line height maintenance
- Padding and margin control
- Overflow handling
- White-space management

### Layout Stability
- Transform origin control
- Scale transformation
- Height constraints removal
- Geometric precision rendering
- Content box modeling

### Visual Consistency
- Text rendering optimization
- Font weight preservation
- Style exactness
- Display mode control
- Spacing precision

## Position Management
### Original Position System
- Exact pixel value storage
- getBoundingClientRect() calculations
- Dataset attribute preservation
- Position reference maintenance

### Style-Based Positioning
- Percentage to pixel conversion
- Parent dimension calculations
- Aspect ratio preservation
- Dimension maintenance

### Transform Management
- Rotation extraction
- Translation removal
- Z-index preservation
- Position finalization

## Style Inheritance System
### Bubble Type Management
- Previous type preservation
- Visibility state tracking
- Type transition handling
- Class management

### Style Application Hierarchy
1. Custom Styles
   - Complete style replacement
   - Type transition handling
   - Position preservation
   - Effect maintenance

2. Default Styles
   - Font family defaults
   - Size standards
   - Weight preferences
   - Alignment defaults

3. Computed Styles
   - Export mode preservation
   - Dynamic calculations
   - Conflict resolution
   - State maintenance

## Text Outline System
### Creation and Management
- Text-shadow technique
- Color customization
- Thickness control
- Attribute tracking

### Effect Integration
- Shadow coordination
- Opacity handling
- Preview generation
- State persistence

### Export Considerations
- Style preservation
- Rendering optimization
- Visual consistency
- Performance management

## Bubble Tail System
### SVG Tail Rendering
- Speech Bubble Tails
  - Dynamic SVG path generation
  - Configurable properties:
    * Length (10-60px)
    * Width (5-40px)
    * Position inset (10-90%)
    * Shear angle (-50 to +50)
    * Outline toggle
    * Color inheritance
  - Position-specific path calculations
    * Bottom tail geometry
    * Top tail geometry
    * Left tail geometry
    * Right tail geometry

- Thought Bubble Tails
  - Circle-based SVG generation
  - Configurable properties:
    * Number of circles (1-5)
    * Circle radius (2-10px)
    * Circle spacing (2-15px)
    * Position inset (10-90%)
    * Offset (-50 to +50)
    * Color inheritance

### State Serialization
- Text Content State
  - HTML content preservation
  - Style attributes
  - Custom dataset values
  - Position information
  - Dimension values

- Bubble State
  - Type and previous type
  - Tail position and settings
  - Position grid value
  - Background colors
  - Opacity values

- Style State
  - Font properties
  - Text decoration
  - Alignment
  - Color schemes
  - Outline properties
  - Shadow properties

### Style Inheritance System
- Bubble Type Inheritance
  - Style preservation during type changes
  - Default style application
  - Custom style overrides

- Color Inheritance
  - Background color propagation
  - Tail color matching
  - Outline color coordination
  - Shadow color relationships

### Export Mode Specifics
- Style Preservation
  - Exact font metrics
  - Line height maintenance
  - Padding/margin control
  - Overflow handling
  - White-space management

- Layout Stability
  - Transform origin control
  - Scale transformation
  - Height constraints
  - Geometric precision
  - Content box modeling

- Visual Consistency
  - Text rendering optimization
  - Font weight preservation
  - Style exactness
  - Display mode control
  - Spacing precision

## Event Handling
- Delete operation management
- State saving triggers
- History management
- Drag and drop coordination

## Integration Points
- ComicCreator integration
- History manager integration
- Drag and drop manager integration
- UI manager integration
- Utils integration

## Special Features
- Export mode handling
- Line break management
- Color conversion utilities
- Position grid management
- Notification system integration

## Export Mode Features
### Style Preservation
- Exact font metrics preservation
- Line height maintenance
- Padding and margin control
- Overflow handling
- White-space management

### Layout Stability
- Transform origin control
- Scale transformation
- Height constraints removal
- Geometric precision rendering
- Content box modeling

### Visual Consistency
- Text rendering optimization
- Font weight preservation
- Style exactness
- Display mode control
- Spacing precision

## Position Management
### Original Position System
- Exact pixel value storage
- getBoundingClientRect() calculations
- Dataset attribute preservation
- Position reference maintenance

### Style-Based Positioning
- Percentage to pixel conversion
- Parent dimension calculations
- Aspect ratio preservation
- Dimension maintenance

### Transform Management
- Rotation extraction
- Translation removal
- Z-index preservation
- Position finalization

## Style Inheritance System
### Bubble Type Management
- Previous type preservation
- Visibility state tracking
- Type transition handling
- Class management

### Style Application Hierarchy
1. Custom Styles
   - Complete style replacement
   - Type transition handling
   - Position preservation
   - Effect maintenance

2. Default Styles
   - Font family defaults
   - Size standards
   - Weight preferences
   - Alignment defaults

3. Computed Styles
   - Export mode preservation
   - Dynamic calculations
   - Conflict resolution
   - State maintenance

## Text Outline System
### Creation and Management
- Text-shadow technique
- Color customization
- Thickness control
- Attribute tracking

### Effect Integration
- Shadow coordination
- Opacity handling
- Preview generation
- State persistence

### Export Considerations
- Style preservation
- Rendering optimization
- Visual consistency
- Performance management 
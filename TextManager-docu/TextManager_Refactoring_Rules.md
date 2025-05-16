# TextManager Refactoring Rules

## Core Principles
1. Maintain exact functionality
2. Preserve all existing behaviors
3. Keep current performance levels
4. Ensure backward compatibility
5. Follow single responsibility

## Required Files Structure
1. `TextBubbleManager.js`
   - Bubble creation
   - Type management
   - Style application
   - Position handling
   - Event coordination

2. `TextContentManager.js`
   - Content editing
   - Font handling
   - Text styling
   - Outline effects
   - Shadow effects

3. `TextTailManager.js`
   - SVG generation
   - Position calculation
   - Style inheritance
   - Event handling
   - Visual updates

4. `TextStateManager.js`
   - State serialization
   - State restoration
   - History integration
   - Export handling
   - Cache management

5. `TextStyleManager.js`
   - Style creation
   - Style application
   - Inheritance rules
   - Default handling
   - Preview generation

6. `TextEventManager.js`
   - Event delegation
   - Handler coordination
   - Popup management
   - Selection tracking
   - Keyboard shortcuts

7. `TextPositionManager.js`
   - Position calculation
   - Grid management
   - Boundary checking
   - Transform handling
   - Coordinate systems

8. `TextExportManager.js`
   - Export detection
   - Style preservation
   - Layout stability
   - Visual consistency
   - Performance optimization

9. `TextUIManager.js`
   - Popup creation
   - Control updates
   - Preview handling
   - Notification system
   - UI coordination

10. `TextIntegrationManager.js`
    - Manager coordination
    - API exposure
    - Event broadcasting
    - State synchronization
    - Error handling

## Integration Rules
1. Manager Communication
   - Use event system
   - Maintain loose coupling
   - Follow pub/sub pattern
   - Handle async operations
   - Manage state updates

2. State Management
   - Central state store
   - Atomic updates
   - Validation checks
   - Error recovery
   - Cache management

3. Error Handling
   - Consistent patterns
   - Graceful degradation
   - User notification
   - State recovery
   - Logging system

4. Performance Guidelines
   - Batch DOM updates
   - Optimize calculations
   - Cache results
   - Lazy loading
   - Resource cleanup

5. Testing Requirements
   - Unit test coverage
   - Integration tests
   - Visual regression
   - Performance metrics
   - Error scenarios

## Migration Steps
1. Create new files
2. Move related code
3. Update imports
4. Test functionality
5. Handle regressions

## Validation Rules
1. No functionality changes
2. All tests must pass
3. Performance must match
4. No new dependencies
5. Clean error handling

## Documentation Requirements
1. JSDoc comments
2. Method descriptions
3. Type definitions
4. Example usage
5. Error scenarios

## Code Style Rules
1. Consistent naming
2. Clear structure
3. Type safety
4. Error handling
5. Performance optimization

## Dependency Rules
1. **Circular Dependency Prevention**
   - Files can only depend on more fundamental files
   - Core files cannot depend on feature files
   - Feature files must communicate through TextManagerCore

2. **State Access Rules**
   - Only TextStateManager can directly access localStorage
   - Only TextManagerCore can hold the current text box reference
   - Sub-managers must request state changes through TextManagerCore

3. **Event Handling Rules**
   - Each manager handles its own events
   - Cross-manager events must go through TextManagerCore
   - Event listener cleanup must be handled by the manager that created them

## Integration Rules
1. **ComicCreator Integration**
   - All interactions with ComicCreator must go through TextManagerCore
   - Sub-managers cannot directly access ComicCreator
   - Maintain all existing ComicCreator callbacks and events

2. **External Dependencies**
   - Document all external utility functions used
   - Maintain existing utility function signatures
   - Keep all current third-party dependencies

## Validation Checklist
- [ ] All original functions accounted for
- [ ] All state mutations preserved
- [ ] All event listeners maintained
- [ ] All UI behaviors identical
- [ ] All error handling preserved
- [ ] All external integrations working
- [ ] All persistence features working
- [ ] All SVG generation identical
- [ ] All style applications working
- [ ] All position calculations accurate

## Strict Preservation Rules
1. **Function Signatures**
   ```javascript
   // MUST keep exact signatures
   oldFunction(param1, param2) {} 
   // becomes
   newManager.oldFunction(param1, param2) {}
   ```

2. **State Updates**
   ```javascript
   // MUST maintain exact state update order
   this.state.update()
   this.saveState()
   // becomes
   this.textStateManager.update()
   this.textStateManager.saveState()
   ```

3. **Event Handling**
   ```javascript
   // MUST preserve exact event handling
   element.addEventListener('click', this.handler)
   // becomes
   element.addEventListener('click', this.uiManager.handler)
   ```

4. **DOM Manipulation**
   ```javascript
   // MUST maintain exact DOM structure
   createElement('div', { class: 'text-bubble' })
   // becomes
   this.bubbleCreator.createElement('div', { class: 'text-bubble' })
   ```

## Warning Signs
- Any change in visual appearance
- Any change in event timing
- Any change in state update order
- Any new error messages
- Any performance changes
- Any change in browser console output
- Any change in localStorage structure
- Any change in DOM structure
- Any change in SVG generation
- Any change in export output

## Additional Preservation Rules

### Export Mode Preservation
1. **Style Exactness**
   ```javascript
   // MUST preserve exact styles during export
   if (document.body.classList.contains('exporting')) {
     preserveExactFontMetrics();
     maintainLayoutStability();
     optimizeRendering();
   }
   ```

2. **Layout Stability**
   ```javascript
   // MUST maintain exact layout during export
   textElement.style.transformOrigin = 'top left';
   textElement.style.transform = 'scale(1)';
   textElement.style.maxHeight = 'none';
   ```

3. **Visual Consistency**
   ```javascript
   // MUST preserve visual appearance
   textElement.style.whiteSpace = 'pre-wrap';
   textElement.style.textRendering = 'geometricPrecision';
   ```

### Position Restoration Rules
1. **Original Position Priority**
   ```javascript
   // MUST use original position when available
   if (textState.originalPosition) {
     applyOriginalPosition();
   } else {
     applyStyleBasedPosition();
   }
   ```

2. **Transform Handling**
   ```javascript
   // MUST preserve rotation while handling position
   const rotation = extractRotation(transform);
   applyPosition();
   applyRotation(rotation);
   ```

3. **Coordinate System**
   ```javascript
   // MUST maintain exact coordinates
   const rect = element.getBoundingClientRect();
   storeExactPosition(rect);
   ```

### Style Inheritance Rules
1. **Bubble Type Transitions**
   ```javascript
   // MUST preserve bubble type history
   storePreviousBubbleType();
   applyNewBubbleType();
   maintainVisibilityState();
   ```

2. **Style Application Order**
   ```javascript
   // MUST follow strict style application order
   applyCustomStyle();
   applyDefaultFallbacks();
   preserveComputedStyles();
   ```

3. **State Preservation**
   ```javascript
   // MUST maintain style state
   saveStyleState();
   applyTransition();
   restoreStyleState();
   ```

### Text Outline Guidelines
1. **Shadow Implementation**
   ```javascript
   // MUST use consistent shadow technique
   applyTextShadow();
   maintainOutlineState();
   handleEffectCoordination();
   ```

2. **Effect Management**
   ```javascript
   // MUST coordinate all effects
   preserveOutlineEffect();
   coordinateShadowEffect();
   maintainOpacity();
   ```

3. **Export Handling**
   ```javascript
   // MUST optimize for export
   if (isExporting) {
     optimizeOutlineRendering();
     preserveExactEffects();
   }
   ```

## Validation Requirements

### Export Mode Validation
- [ ] All font metrics exactly preserved
- [ ] Layout remains stable across exports
- [ ] Visual appearance consistent
- [ ] Performance optimized
- [ ] All special cases handled

### Position Validation
- [ ] Original positions correctly restored
- [ ] Transforms properly handled
- [ ] Coordinates exactly maintained
- [ ] All edge cases covered
- [ ] Performance acceptable

### Style Inheritance Validation
- [ ] Bubble types correctly transitioned
- [ ] Styles properly cascaded
- [ ] States accurately preserved
- [ ] All combinations tested
- [ ] Edge cases handled

### Text Outline Validation
- [ ] Shadow technique consistent
- [ ] Effects properly coordinated
- [ ] Export optimization verified
- [ ] Performance acceptable
- [ ] Visual consistency maintained 
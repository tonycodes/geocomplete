To fix the bug where the map marker doesn't update when selecting an address, you can add a function to update the marker position when an address is selected. Here is the updated code:

```javascript
// Add a function to update the marker position when an address is selected
function updateMarkerPosition(marker, location) {
  marker.setPosition(location);
}

// Update the geocomplete plugin code to call the updateMarkerPosition function when an address is selected
(function($, window, document, undefined) {
  // Existing code...

  // Add an event listener to update the marker position when an address is selected
  $(document).on("geocode:result", function(event, result) {
    if (result.geometry && result.geometry.location) {
      updateMarkerPosition(marker, result.geometry.location);
    }
  });

  // Existing code...
})(jQuery, window, document);
```

This code adds a function `updateMarkerPosition` that updates the marker position with the selected location. Then, it adds an event listener to call this function when an address is selected. This should fix the bug where the map marker doesn't update when selecting an address.
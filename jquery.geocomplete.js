/**
 * jQuery Geocoding and Places Autocomplete Plugin - Revised
 *
 * @license MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function($, window, document) {

  const defaults = {
    bounds: true,
    country: null,
    map: false,
    details: false,
    detailsAttribute: "name",
    autoselect: true,
    location: false,
    mapOptions: {
      zoom: 14,
      scrollwheel: false,
      mapTypeId: "roadmap"
    },
    markerOptions: {
      draggable: false
    },
    maxZoom: 16,
    types: ['geocode'],
    blur: false
  };

  const componentTypes = [
    "street_address", "route", "intersection", "political", "country",
    "administrative_area_level_1", "administrative_area_level_2",
    "administrative_area_level_3", "colloquial_area", "locality", "sublocality",
    "neighborhood", "premise", "subpremise", "postal_code", "natural_feature",
    "airport", "park", "point_of_interest", "post_box", "street_number", "floor",
    "room", "lat", "lng", "viewport", "location", "formatted_address",
    "location_type", "bounds"
  ];

  const placesDetails = [
    "id", "url", "website", "vicinity", "reference", "name", 
    "rating", "international_phone_number", "icon", "formatted_phone_number"
  ];

  class GeoComplete {
    constructor(input, options) {
      this.options = $.extend(true, {}, defaults, options);
      this.input = input;
      this.$input = $(input);
      this.init();
    }

    init() {
      this.initMap();
      this.initMarker();
      this.initGeocoder();
      this.initDetails();
      this.initLocation();
    }

    initMap() {
      if (!this.options.map) return;

      if (typeof this.options.map.setCenter === "function") {
        this.map = this.options.map;
        return;
      }

      this.map = new google.maps.Map($(this.options.map)[0], this.options.mapOptions);
      this.bindMapEvents();
    }

    bindMapEvents() {
      google.maps.event.addListener(this.map, 'click', (e) => this.trigger('geocode:click', e.latLng));
      google.maps.event.addListener(this.map, 'zoom_changed', () => this.trigger('geocode:zoom', this.map.getZoom()));
    }

    initMarker() {
      if (!this.map) return;

      let options = $.extend({}, this.options.markerOptions, { map: this.map });
      if (options.disabled) return;

      this.marker = new google.maps.Marker(options);
      google.maps.event.addListener(this.marker, 'dragend', (event) => {
        this.trigger("geocode:dragged", event.latLng);
      });
    }

    initGeocoder() {
      const options = {
        types: this.options.types,
        bounds: (this.options.bounds === true) ? null : this.options.bounds,
        componentRestrictions: this.options.country ? { country: this.options.country } : null
      };

      this.autocomplete = new google.maps.places.Autocomplete(this.input, options);
      this.geocoder = new google.maps.Geocoder();

      if (this.map && this.options.bounds === true) {
        this.autocomplete.bindTo('bounds', this.map);
      }

      this.bindGeocoderEvents();
    }

    bindGeocoderEvents() {
      google.maps.event.addListener(this.autocomplete, 'place_changed', () => this.placeChanged());

      this.$input.keypress((event) => {
        if (event.keyCode === 13) return false;
      });

      this.$input.on("geocode", () => this.find());

      if (this.options.blur) {
        this.$input.blur(() => this.find());
      }
    }

    initDetails() {
      if (!this.options.details) return;

      const $details = $(this.options.details);
      this.details = {};

      componentTypes.concat(placesDetails).forEach((key) => {
        this.details[key] = $details.find(`[${this.options.detailsAttribute}="${key}"]`);
      });

      this.$details = $details;
    }

    initLocation() {
      const location = this.options.location;
      if (!location) return;

      let latLng;
      if (typeof location === 'string') {
        this.find(location);
      } else if (Array.isArray(location)) {
        latLng = new google.maps.LatLng(location[0], location[1]);
      } else if (location instanceof google.maps.LatLng) {
        latLng = location;
      }

      if (latLng) {
        this.map.setCenter(latLng);
        if (this.marker) this.marker.setPosition(latLng);
      }
    }

    find(address) {
      this.geocode({ address: address || this.$input.val() });
    }

    geocode(request) {
      request.bounds = this.options.bounds && !request.bounds ? (this.options.bounds === true ? this.map.getBounds() : this.options.bounds) : null;
      if (this.options.country) {
        request.region = this.options.country;
      }
      this.geocoder.geocode(request, (results, status) => this.handleGeocode(results, status));
    }

    handleGeocode(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        const result = results[0];
        this.$input.val(result.formatted_address);
        this.update(result);

        if (results.length > 1) {
          this.trigger("geocode:multiple", results);
        }

      } else {
        this.trigger("geocode:error", status);
      }
    }

    update(result) {
      if (this.map) this.center(result.geometry);
      if (this.$details) this.fillDetails(result);
      this.trigger("geocode:result", result);
    }

    center(geometry) {
      if (geometry.viewport) {
        this.map.fitBounds(geometry.viewport);
        if (this.map.getZoom() > this.options.maxZoom) {
          this.map.setZoom(this.options.maxZoom);
        }
      } else {
        this.map.setZoom(this.options.maxZoom);
        this.map.setCenter(geometry.location);
      }

      if (this.marker) {
        this.marker.setPosition(geometry.location);
        this.marker.setAnimation(this.options.markerOptions.animation);
      }
    }

    fillDetails(result) {
      const data = {};
      result.address_components.forEach((component) => {
        const name = component.types[0];
        data[name] = {
          long_name: component.long_name,
          short_name: component.short_name
        };
      });
      
      placesDetails.forEach((detail) => {
        data[detail] = result[detail];
      });

      const { geometry } = result;
      $.extend(data, {
        formatted_address: result.formatted_address,
        location_type: geometry.location_type || "PLACES",
        viewport: geometry.viewport,
        bounds: geometry.bounds,
        location: geometry.location,
        lat: geometry.location.lat(),
        lng: geometry.location.lng()
      });

      Object.entries(this.details).forEach(([key, $detail]) => {
        const value = data[key];
        this.setDetail($detail, value && value.long_name ? value.long_name : "");
      });

      this.data = data;
    }

    setDetail($element, value) {
      if ($element.is(":input")) {
        $element.val(value || "");
      } else {
        $element.text(value || "");
      }
    }

    placeChanged() {
      const place = this.autocomplete.getPlace();
      if (!place || !place.geometry) {
        if (this.options.autoselect) {
          const autoSelection = this.selectFirstResult();
          this.find(autoSelection);
        }
      } else {
        this.update(place);
      }
    }

    selectFirstResult() {
      const $selected = $(".pac-item-selected").length ? $(".pac-item-selected") : $(".pac-container .pac-item:first");
      const firstResultText = $selected.find('span:nth-child(2)').text();
      const additionalInfo = $selected.find('span:nth-child(3)').text();
      const fullResultText = additionalInfo ? `${firstResultText} - ${additionalInfo}` : firstResultText;
      this.$input.val(fullResultText);
      return fullResultText;
    }

    trigger(event, argument) {
      this.$input.trigger(event, [argument]);
    }
  }

  $.fn.geocomplete = function(options) {
    const attribute = 'plugin_geocomplete';

    if (typeof options === "string") {
      const instance = $(this).data(attribute);
      if (instance && typeof instance[options] === "function") {
        instance[options].apply(instance, Array.prototype.slice.call(arguments, 1));
        return $(this);
      }
      return $(this).data(attribute)[options];
    } else {
      return this.each(function() {
        if (!$.data(this, attribute)) {
          const instance = new GeoComplete(this, options);
          $.data(this, attribute, instance);
        }
      });
    }
  };

})(jQuery, window, document);
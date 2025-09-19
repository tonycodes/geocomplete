(function($, window, document, undefined){

  var defaults = {
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

  var componentTypes = ("street_address route intersection political " +
    "country administrative_area_level_1 administrative_area_level_2 " +
    "administrative_area_level_3 colloquial_area locality sublocality " +
    "neighborhood premise subpremise postal_code natural_feature airport " +
    "park point_of_interest post_box street_number floor room " +
    "lat lng viewport location " +
    "formatted_address location_type bounds").split(" ");

  var placesDetails = ("id url website vicinity reference name rating " +
    "international_phone_number icon formatted_phone_number").split(" ");

  function GeoComplete(input, options) {

    this.options = $.extend(true, {}, defaults, options);

    this.input = input;
    this.$input = $(input);

    this._defaults = defaults;
    this._name = 'geocomplete';

    this.init();
  }

  $.extend(GeoComplete.prototype, {
    init: function(){
      this.initMap();
      this.initMarker();
      this.initGeocoder();
      this.initDetails();
      this.initLocation();
    },

    initMap: function(){
      if (!this.options.map){ return; }

      if (typeof this.options.map.setCenter == "function"){
        this.map = this.options.map;
        return;
      }

      this.map = new google.maps.Map(
        $(this.options.map)[0],
        this.options.mapOptions
      );

      google.maps.event.addListener(
        this.map,
        'click',
        $.proxy(this.mapClicked, this)
      );

      google.maps.event.addListener(
        this.map,
        'zoom_changed',
        $.proxy(this.mapZoomed, this)
      );

      if (this.options.location){
        this.map.setCenter(this.options.location);
        this.map.setZoom(this.options.mapOptions.zoom);
      }
    },

    initMarker: function(){
      if (this.options.markerOptions.disabled){ return; }

      this.marker = new google.maps.Marker(
        $.extend({map: this.map}, this.options.markerOptions)
      );

      google.maps.event.addListener(
        this.marker,
        'dragend',
        $.proxy(this.markerDragged, this)
      );
    },

    initGeocoder: function(){
      this.geocoder = new google.maps.Geocoder();
    },

    initDetails: function(){
      if (!this.options.details){ return; }

      this.details = {};
      var $details = $(this.options.details);

      $.each(componentTypes, function(index, key){
        this.details[key] = $details.find("[" + this.options.detailsAttribute + "=" + key + "]");
      });
    },

    initLocation: function(){
      if (this.options.location){
        this.find("");
      }
    },

    find: function(value){
      var request = {};

      if (typeof value == "string"){
        request.address = value;
      } else {
        request.latLng = value;
      }

      if (this.options.bounds && this.map){
        if (this.options.bounds === true){
          request.bounds = this.map.getBounds();
        } else {
          request.bounds = this.options.bounds;
        }
      }

      this.geocoder.geocode(request, $.proxy(this.handleGeocode, this));
    },

    handleGeocode: function(results, status){
      if (status == google.maps.GeocoderStatus.OK){
        this.map.fitBounds(results[0].geometry.viewport);
        this.map.setZoom(Math.min(this.map.getZoom(), this.options.maxZoom));

        this.marker.setPosition(results[0].geometry.location);
        this.$input.val(results[0].formatted_address);

        if (this.options.details){
          this.fillDetails(results[0]);
        }
      }
    },

    fillDetails: function(data){
      var geometry = data.geometry;
      var viewport = geometry.viewport;
      var location = geometry.location;

      this.details.location.val([location.lat(), location.lng()].join(", "));
      this.details.viewport.val([
        [
          viewport.getSouthWest().lat(),
          viewport.getSouthWest().lng()
        ].join(", "),
        [
          viewport.getNorthEast().lat(),
          viewport.getNorthEast().lng()
        ].join(", ")
      ].join(" - "));

      $.each(componentTypes, function(index, key){
        if (this.details[key]){
          this.details[key].val(data[key]);
        }
      });

      $.each(placesDetails, function(index, key){
        if (this.details[key]){
          this.details[key].val(data[key]);
        }
      });
    },

    mapClicked: function(event){
      this.marker.setPosition(event.latLng);
      this.find(event.latLng);
    },

    mapZoomed: function(){
      this.find(this.marker.getPosition());
    },

    markerDragged: function(){
      this.find(this.marker.getPosition());
    }

  });

  $.fn.geocomplete = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_geocomplete")) {
        $.data(this, "plugin_geocomplete", new GeoComplete(this, options));
      }
    });
  };

})(jQuery, window, document);
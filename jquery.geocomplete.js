/**
 * jQuery Geocoding and Places Autocomplete Plugin - V 1.5.0
 *
 * @license MIT License <http://www.opensource.org/licenses/mit-license.php>
 * @see https://github.com/ubilabs/geocomplete/
 */

(function ($, window, document) {
    'use strict';

    const defaults = {
        bounds: true,
        country: null,
        map: false,
        details: false,
        detailsAttribute: 'name',
        autoselect: true,
        location: false,
        mapOptions: {
            zoom: 14,
            scrollwheel: false,
            mapTypeId: 'roadmap'
        },
        markerOptions: {
            draggable: false
        },
        maxZoom: 16,
        types: ['geocode'],
        blur: false
    };

    const componentTypes = [
        'street_address', 'route', 'intersection', 'political', 'country', 
        'administrative_area_level_1', 'administrative_area_level_2', 
        'administrative_area_level_3', 'colloquial_area', 'locality', 
        'sublocality', 'neighborhood', 'premise', 'subpremise', 
        'postal_code', 'natural_feature', 'airport', 'park', 
        'point_of_interest', 'post_box', 'street_number', 
        'floor', 'room', 'lat', 'lng', 'viewport', 'location', 
        'formatted_address', 'location_type', 'bounds'
    ];

    const placesDetails = [
        'id', 'url', 'website', 'vicinity', 
        'reference', 'name', 'rating', 
        'international_phone_number', 'icon', 'formatted_phone_number'
    ];

    class GeoComplete {
        constructor(input, options) {
            this.options = $.extend(true, {}, defaults, options);
            this.input = input;
            this.$input = $(input);
            this._name = 'geocomplete';

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

            if (typeof this.options.map.setCenter === 'function') {
                this.map = this.options.map;
                return;
            }

            this.map = new google.maps.Map($(this.options.map)[0], this.options.mapOptions);
            this.bindMapEvents();
        }

        bindMapEvents() {
            google.maps.event.addListener(this.map, 'click', this.mapClicked.bind(this));
            google.maps.event.addListener(this.map, 'zoom_changed', this.mapZoomed.bind(this));
        }

        initMarker() {
            if (!this.map) return;

            const options = $.extend({}, this.options.markerOptions, { map: this.map });

            if (options.disabled) return;

            this.marker = new google.maps.Marker(options);
            google.maps.event.addListener(this.marker, 'dragend', this.markerDragged.bind(this));
        }

        initGeocoder() {
            const options = {
                types: this.options.types,
                bounds: this.options.bounds === true ? null : this.options.bounds,
                componentRestrictions: this.options.country ? { country: this.options.country } : {}
            };

            this.autocomplete = new google.maps.places.Autocomplete(this.input, options);
            this.geocoder = new google.maps.Geocoder();

            if (this.map && this.options.bounds === true) {
                this.autocomplete.bindTo('bounds', this.map);
            }

            google.maps.event.addListener(this.autocomplete, 'place_changed', this.placeChanged.bind(this));
            this.preventFormSubmission();
            this.bindGeocodeEvents();
        }

        preventFormSubmission() {
            this.$input.on('keypress', (event) => {
                if (event.keyCode === 13) return false;
            });
        }

        bindGeocodeEvents() {
            this.$input.on('geocode', () => this.find());
            if (this.options.blur) {
                this.$input.on('blur', () => this.find());
            }
        }

        initDetails() {
            if (!this.options.details) return;

            const $details = $(this.options.details);
            this.details = {};

            componentTypes.forEach(type => {
                this.details[type] = $details.find(`[${this.options.detailsAttribute}="${type}"]`);
                this.details[`${type}_short`] = $details.find(`[${this.options.detailsAttribute}="${type}_short"]`);
            });

            placesDetails.forEach(detail => {
                this.details[detail] = $details.find(`[${this.options.detailsAttribute}="${detail}"]`);
            });

            this.$details = $details;
        }

        initLocation() {
            const location = this.options.location;

            if (!location) return;

            let latLng;

            if (typeof location === 'string') {
                this.find(location);
                return;
            }

            if (Array.isArray(location)) {
                latLng = new google.maps.LatLng(location[0], location[1]);
            }

            if (location instanceof google.maps.LatLng) {
                latLng = location;
            }

            if (latLng) {
                if (this.map) this.map.setCenter(latLng);
                if (this.marker) this.marker.setPosition(latLng);
            }
        }

        find(address) {
            this.geocode({
                address: address || this.$input.val()
            });
        }

        geocode(request) {
            if (this.options.bounds && !request.bounds) {
                request.bounds = this.options.bounds === true ? this.map?.getBounds() : this.options.bounds;
            }

            if (this.options.country) {
                request.region = this.options.country;
            }

            this.geocoder.geocode(request, this.handleGeocode.bind(this));
        }

        handleGeocode(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                const result = results[0];
                this.$input.val(result.formatted_address);
                this.update(result);

                if (results.length > 1) {
                    this.trigger('geocode:multiple', results);
                }
            } else {
                this.trigger('geocode:error', status);
            }
        }

        selectFirstResult() {
            const selected = $(".pac-item-selected").length ? '-selected' : '';
            const $firstItem = $(".pac-container .pac-item" + selected + ":first");
            const firstResult = $firstItem.find("span:nth-child(2)").text() +
                ($firstItem.find("span:nth-child(3)").text() ? ' - ' + $firstItem.find("span:nth-child(3)").text() : '');

            this.$input.val(firstResult);
            return firstResult;
        }

        update(result) {
            if (this.map) {
                this.center(result.geometry);
            }

            if (this.$details) {
                this.fillDetails(result);
            }

            this.trigger('geocode:result', result);
        }

        fillDetails(result) {
            const data = this.extractAddressComponents(result);
            $.extend(data, this.getPlacesDetails(result), {
                formatted_address: result.formatted_address,
                location_type: result.geometry.location_type || 'PLACES',
                viewport: result.geometry.viewport,
                bounds: result.geometry.bounds,
                location: result.geometry.location,
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng()
            });

            $.each(this.details, ($detail, key) => {
                this.setDetail($detail, data[key]);
            });

            this.data = data;
        }

        extractAddressComponents(result) {
            const data = {};
            $.each(result.address_components, function (_, object) {
                const name = object.types[0];
                data[name] = object.long_name;
                data[`${name}_short`] = object.short_name;
            });
            return data;
        }

        getPlacesDetails(result) {
            return placesDetails.reduce((acc, key) => {
                acc[key] = result[key];
                return acc;
            }, {});
        }

        setDetail($element, value) {
            if (value === undefined) {
                value = '';
            } else if (typeof value.toUrlValue === 'function') {
                value = value.toUrlValue();
            }

            if ($element.is(':input')) {
                $element.val(value);
            } else {
                $element.text(value);
            }
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
                if (this.options.markerOptions.animation) {
                    this.marker.setAnimation(this.options.markerOptions.animation);
                }
            }
        }

        markerDragged(event) {
            this.trigger('geocode:dragged', event.latLng);
        }

        mapClicked(event) {
            this.trigger('geocode:click', event.latLng);
        }

        mapZoomed() {
            this.trigger('geocode:zoom', this.map.getZoom());
        }

        resetMarker() {
            this.marker.setPosition(this.data.location);
            this.setDetail(this.details.lat, this.data.location.lat());
            this.setDetail(this.details.lng, this.data.location.lng());
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

        trigger(event, argument) {
            this.$input.trigger(event, [argument]);
        }
    }

    $.fn.geocomplete = function (options) {
        const attribute = 'plugin_geocomplete';

        if (typeof options === 'string') {
            const instance = this.data(attribute) || this.geocomplete().data(attribute);
            const prop = instance[options];

            if (typeof prop === 'function') {
                prop.apply(instance, Array.prototype.slice.call(arguments, 1));
                return this;
            } 
            return arguments.length === 2 ? arguments[1] : prop;
        } else {
            return this.each(function () {
                if (!$.data(this, attribute)) {
                    const instance = new GeoComplete(this, options);
                    $.data(this, attribute, instance);
                }
            });
        }
    };

})(jQuery, window, document);
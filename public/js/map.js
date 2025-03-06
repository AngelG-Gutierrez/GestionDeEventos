let map;
let service;
let izucarPolygon;
let markers = []; // Aquí guardaremos los marcadores

function initMap() {
  const izucar = { lat: 18.60076854997393, lng: -98.4946046863255 }; // Coordenadas de Izúcar de Matamoros, Puebla
  map = new google.maps.Map(document.getElementById('map'), {
    center: izucar,
    zoom: 13
  });

  // Crea el objeto de búsqueda
  const searchBox = new google.maps.places.SearchBox(document.getElementById('search-input'));

  // Cuando el usuario selecciona una dirección, busca la dirección
  searchBox.addListener('places_changed', () => {
    const places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Elimina los marcadores antiguos
    for (let i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    markers = [];

    // Para cada lugar, obtén el icono, nombre y ubicación
    const bounds = new google.maps.LatLngBounds();
    places.forEach(place => {
      if (!place.geometry) {
        console.log("El lugar no tiene geometría.");
        return;
      }

      // Crea un marcador para cada lugar
      const marker = new google.maps.Marker({
        map,
        title: place.name,
        position: place.geometry.location
      });
      markers.push(marker); // Guarda el marcador

      if (place.geometry.viewport) {
        // Solo los lugares geocodificados tendrán viewport
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }

      // Comprueba si la ubicación está dentro del polígono
      if (google.maps.geometry.poly.containsLocation(place.geometry.location, izucarPolygon)) {
        Swal.fire({
          title: 'Felicidades',
          text: 'La ubicación está dentro del rango de servicio.',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      } else {
        Swal.fire({
          title: 'Lo sentimos',
          text: 'La ubicación está fuera del rango de servicio.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });

    map.fitBounds(bounds);
  });

  // Coordenadas del polígono
  const polygonCoords = [
    { lat: 18.678517, lng: -98.441384 },
    { lat: 18.561547, lng: -98.439465 },
    { lat: 18.578038, lng: -98.557112 }
  ];

  // Polígono en la zona de Izúcar de Matamoros
  izucarPolygon = new google.maps.Polygon({
    paths: polygonCoords,
    strokeColor: '#016815',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#016815',
    fillOpacity: 0.35
  });
  izucarPolygon.setMap(map);
}

window.onload = initMap;

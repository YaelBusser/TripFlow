import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

let MapView: any = null;
let Marker: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (e) {
  // no-op fallback
}

interface DestinationMapSelectorProps {
  onDestinationSelected: (destination: {latitude: number, longitude: number, name: string}) => void;
  onCancel: () => void;
}

export default function DestinationMapSelector({ onDestinationSelected, onCancel }: DestinationMapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationName, setLocationName] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Get current location
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const currentLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          setCurrentLocation(currentLoc);
          
          // Zoom sur la position actuelle après un court délai
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: currentLoc.latitude,
                longitude: currentLoc.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }, 1000);
            }
          }, 500);
        }
      } catch (error) {
        console.log('Location permission denied or error:', error);
      }
    })();
  }, []);

  const region = useMemo(() => {
    if (selectedLocation) {
      return {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
    }
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      };
    }
    return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  }, [selectedLocation, currentLocation]);

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(query);
      const searchResults = results.map((result, index) => ({
        id: `${index}`,
        name: query,
        address: `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      
      setSearchResults(searchResults);
    } catch (error) {
      console.log('Erreur de recherche:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const location = {
      latitude: result.latitude,
      longitude: result.longitude
    };
    setSelectedLocation(location);
    setLocationName(result.name);
    setSearchResults([]);
    
    // Zoom sur le résultat de recherche
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: result.latitude,
        longitude: result.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    // Zoom sur le point sélectionné
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 500);
    }
    
    // Get address from coordinates
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const address = addresses[0];
        const name = `${address.city || address.region || 'Lieu'}, ${address.country || ''}`;
        setLocationName(name);
      } else {
        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation || !locationName.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner une destination');
      return;
    }
    
    onDestinationSelected({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      name: locationName.trim()
    });
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      {MapView && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          mapType={Platform.OS === 'ios' ? 'hybrid' : 'terrain'}
          onPress={handleMapPress}
        >
          {currentLocation && (
            <Marker 
              coordinate={currentLocation} 
              title="Position actuelle" 
              description="Votre localisation"
              pinColor="blue"
            />
          )}
          {selectedLocation && (
            <Marker 
              coordinate={selectedLocation} 
              title="Destination sélectionnée" 
              description={locationName}
              pinColor="red"
            />
          )}
        </MapView>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une destination..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchLocation(text);
            }}
          />
          {isSearching && <ActivityIndicator size="small" color="#10b981" />}
        </View>
        
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.searchResultItem}
                  onPress={() => selectSearchResult(item)}
                >
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultAddress}>{item.address}</Text>
                </Pressable>
              )}
              style={styles.searchResultsList}
            />
          </View>
        )}
      </View>

      {/* Selected location info */}
      {selectedLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Destination sélectionnée :</Text>
          <Text style={styles.locationName}>{locationName}</Text>
          <Text style={styles.locationCoords}>
            {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}

       {/* Recenter button */}
       {currentLocation && (
         <View style={styles.recenterButtonContainer}>
           <Pressable style={styles.recenterButton} onPress={centerOnCurrentLocation}>
             <Text style={styles.recenterIcon}>🎯</Text>
           </Pressable>
         </View>
       )}

       {/* Action buttons */}
       <View style={styles.actionButtons}>
         <Pressable style={styles.cancelButton} onPress={onCancel}>
           <Text style={styles.cancelButtonText}>Annuler</Text>
         </Pressable>
         <Pressable 
           style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]} 
           onPress={handleConfirm}
           disabled={!selectedLocation}
         >
           <Text style={styles.confirmButtonText}>Confirmer</Text>
         </Pressable>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
   confirmButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: 'white',
   },
   recenterButtonContainer: {
     position: 'absolute',
     bottom: 100,
     right: 20,
   },
   recenterButton: {
     width: 50,
     height: 50,
     borderRadius: 25,
     backgroundColor: 'white',
     alignItems: 'center',
     justifyContent: 'center',
     shadowColor: '#000',
     shadowOpacity: 0.2,
     shadowRadius: 8,
     shadowOffset: { width: 0, height: 4 },
     elevation: 4,
   },
   recenterIcon: {
     fontSize: 24,
   },
 });

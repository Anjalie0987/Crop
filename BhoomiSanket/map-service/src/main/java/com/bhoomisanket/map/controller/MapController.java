package com.bhoomisanket.map.controller;

import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.geojson.feature.FeatureJSON;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Paths;

@RestController
@RequestMapping("/map")
public class MapController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MapController.class);

    @Value("${shapefile.base.path}")
    private String shapefileBasePath;

    @GetMapping(value = "/subdistrict", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getSubDistrictBoundary(
            @org.springframework.web.bind.annotation.RequestParam String state,
            @org.springframework.web.bind.annotation.RequestParam String district) {

        try {
            // Path: subdistrict/SUBDISTRICT_BOUNDARY_WGS84.shp
            File file = Paths.get(shapefileBasePath, "subdistrict", "SUBDISTRICT_BOUNDARY_WGS84.shp").toFile();
            log.info("Reading sub-district shapefile from: {}", file.getAbsolutePath());

            if (!file.exists()) {
                log.error("Sub-district shapefile not found: {}", file.getAbsolutePath());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"Sub-district shapefile not found\"}");
            }

            ShapefileDataStore store = new ShapefileDataStore(file.toURI().toURL());
            SimpleFeatureCollection features = store.getFeatureSource().getFeatures();

            // Filter features by District name (case-insensitive)
            // Common attribute names: DISTRICT, DIST_NAME, dtname, etc.
            org.geotools.data.simple.SimpleFeatureIterator it = features.features();
            org.geotools.feature.DefaultFeatureCollection filteredFeatures = new org.geotools.feature.DefaultFeatureCollection();

            try {
                while (it.hasNext()) {
                    org.opengis.feature.simple.SimpleFeature feature = it.next();
                    String districtProp = null;

                    // Try common property names
                    if (feature.getAttribute("DISTRICT") != null)
                        districtProp = feature.getAttribute("DISTRICT").toString();
                    else if (feature.getAttribute("DIST_NAME") != null)
                        districtProp = feature.getAttribute("DIST_NAME").toString();
                    else if (feature.getAttribute("dtname") != null)
                        districtProp = feature.getAttribute("dtname").toString();
                    else if (feature.getAttribute("District") != null)
                        districtProp = feature.getAttribute("District").toString();

                    if (districtProp != null && districtProp.trim().equalsIgnoreCase(district.trim())) {
                        filteredFeatures.add(feature);
                    }
                }
            } finally {
                it.close();
            }

            FeatureJSON featureJSON = new FeatureJSON();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            featureJSON.writeFeatureCollection(filteredFeatures, output);

            store.dispose();

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(output.toString());

        } catch (Exception e) {
            log.error("Error processing sub-district shapefile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Error processing sub-district data: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping(value = "/{type}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getBoundary(@PathVariable String type) {
        if (!type.equals("state") && !type.equals("district")) {
            return ResponseEntity.badRequest().body("{\"error\": \"Invalid type. Allowed: state, district\"}");
        }

        try {
            // Strict directory mapping based on user request:
            // state -> "state" folder
            // district -> "district" folder

            String folder = type;
            String fileName = type.equals("state")
                    ? "STATE_BOUNDARY_wgs84.shp"
                    : "DISTRICT_BOUNDARY_WGS84.shp";

            File file = Paths.get(shapefileBasePath, folder, fileName).toFile();

            log.info("Reading shapefile from: {}", file.getAbsolutePath());

            if (!file.exists()) {
                log.error("Shapefile not found: {}", file.getAbsolutePath());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"Shapefile not found: " + file.getName() + "\"}");
            }

            // Using GeoTools to read Shapefile
            ShapefileDataStore store = new ShapefileDataStore(file.toURI().toURL());
            SimpleFeatureCollection features = store.getFeatureSource().getFeatures();

            FeatureJSON featureJSON = new FeatureJSON();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            featureJSON.writeFeatureCollection(features, output);

            store.dispose();

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(output.toString());

        } catch (Exception e) {
            log.error("Error processing shapefile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Error processing shapefile: " + e.getMessage() + "\"}");
        }
    }
}

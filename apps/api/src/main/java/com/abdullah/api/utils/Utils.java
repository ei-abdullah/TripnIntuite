package com.abdullah.api.utils;

import com.abdullah.api.trip.dto.Airport;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStreamReader;

@Component
public class Utils {

    public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371; // Earth's radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public String findClosestIataCode(double targetLat, double targetLng) throws IOException, CsvValidationException {
        String bestIata = null;
        double bestDist = Double.MAX_VALUE;

        try (CSVReader reader = new CSVReader(new InputStreamReader(
                new ClassPathResource("filtered_airports.csv").getInputStream()
        ))) {
            reader.readNext();
            String[] row;

            while ((row = reader.readNext()) != null) {

                double lat = Double.parseDouble(row[4]);
                double lng = Double.parseDouble(row[5]);
                String iata = row[13];

                double d = haversineKm(targetLat, targetLng, lat, lng);
                if (d < bestDist) {
                    bestDist = d;
                    bestIata = iata;
                }
            }

            return bestIata;
        }
    }

    public Airport findAirportByIata(String iata) throws IOException, CsvValidationException {
        if (iata == null || iata.isBlank()) return null;
        try (CSVReader reader = new CSVReader(new InputStreamReader(
                new ClassPathResource("filtered_airports.csv").getInputStream()
        ))) {
            reader.readNext();
            String[] row;
            while ((row = reader.readNext()) != null) {
                if (iata.equalsIgnoreCase(row[13])) {
                    return new Airport(
                            row[13],
                            row[3],
                            Double.parseDouble(row[4]),
                            Double.parseDouble(row[5])
                    );
                }
            }
        }
        return null;
    }
}

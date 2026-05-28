"use client";

import { hotelMapUrl } from "../lib/maps";

export default function HotelStaticMap({
  destination,
  hotels,
  selectedIdx,
}: {
  destination: { lat: number; lng: number };
  hotels: { latitude: number; longitude: number }[];
  selectedIdx: number;
}) {
  const url = hotelMapUrl({
    destination,
    hotels: hotels.map((h) => ({ lat: h.latitude, lng: h.longitude })),
    selectedIdx,
  });

  return (
    <img
      src={url}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
      }}
    />
  );
}
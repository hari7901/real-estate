// src/pages/Listings.js
import React, { useEffect, useState } from 'react';
import API from '../api';
import ListingGrid from '../components/listings/ListingGrid';
import styled from 'styled-components';

const Title = styled.h1`
  text-align: center;
  margin: 2rem 0;
`;

const Listings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const page = 1; // Currently displaying page 1

  useEffect(() => {
    API.get(`/ads/${page}`)
      .then((res) => {
        console.log("Fetched listings response:", res.data);
        if (res.data && res.data.ads) {
          setListings(res.data.ads);
        } else {
          console.error("Response does not contain 'ads' field:", res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching listings:", err);
        setLoading(false);
      });
  }, [page]);

  if (loading) return <p style={{ textAlign: 'center' }}>Loading ads...</p>;
  if (!listings.length)
    return <p style={{ textAlign: 'center' }}>No ads found.</p>;

  return (
    <div>
      <Title>Properties for Rent & Sell</Title>
      <ListingGrid listings={listings} />
    </div>
  );
};

export default Listings;

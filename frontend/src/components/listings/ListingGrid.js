// src/components/listings/ListingGrid.js
import React from 'react';
import styled from 'styled-components';
import ListingCard from './ListingCard';

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem;
`;

const ListingGrid = ({ listings }) => {
  return (
    <Grid>
      {listings.map((ad) => (
        <ListingCard key={ad._id} ad={ad} />
      ))}
    </Grid>
  );
};

export default ListingGrid;

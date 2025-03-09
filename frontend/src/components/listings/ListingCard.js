// src/components/listings/ListingCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

// Styled components for the card
const Card = styled.div`
  border: 1px solid #eaeaea;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s;
  width: 300px;
  margin: 1rem;
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const Image = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
`;

const Details = styled.div`
  padding: 1rem;
`;

const Title = styled.h3`
  margin: 0.5rem 0;
`;

const Address = styled.p`
  font-size: 0.9rem;
  color: #555;
`;

const Price = styled.p`
  font-weight: bold;
  color: #007bff;
`;

const StyledLink = styled(Link)`
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
  &:hover {
    background-color: #0056b3;
  }
`;

const ListingCard = ({ ad }) => {
  // Fallback image if none provided
  const imageUrl = ad.photos && ad.photos[0]?.url
    ? ad.photos[0].url
    : '/placeholder.jpg'; // Ensure you add a placeholder.jpg in the public folder

  return (
    <Card>
      <Image src={imageUrl} alt={ad.title} />
      <Details>
        <Title>{ad.title}</Title>
        <Address>{ad.address}</Address>
        <Price>₹ {ad.pricing.price.toLocaleString()}</Price>
        {/* Adjust the Link route as needed */}
        <StyledLink to={`/ad/${ad.slug}`}>View Details</StyledLink>
      </Details>
    </Card>
  );
};

export default ListingCard;

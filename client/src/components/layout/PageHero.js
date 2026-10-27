import React from 'react';
import './PageHero.css';

const PageHero = ({ title, subtitle }) => (
  <section className="public-page-hero">
    <div className="container public-page-hero-content">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  </section>
);

export default PageHero;

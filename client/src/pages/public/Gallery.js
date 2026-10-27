import PageHero from '../../components/layout/PageHero';
import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Gallery.css';

// Import images
import img1 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.37 PM.jpeg';
import img2 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.39 PM.jpeg';
import img3 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.41 PM.jpeg';
import img4 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.43 PM.jpeg';
import img5 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.44 PM.jpeg';
import img6 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.46 PM.jpeg';
import img7 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.47 PM.jpeg';
import img8 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.49 PM.jpeg';
import img9 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.51 PM.jpeg';
import img10 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.54 PM.jpeg';
import img11 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.56 PM.jpeg';
import img12 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.58 PM.jpeg';
import img13 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.59 PM.jpeg';
import img14 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.06 PM.jpeg';
import img15 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.07 PM.jpeg';
import img16 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.09 PM.jpeg';
import img17 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.11 PM.jpeg';
import img18 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.12 PM.jpeg';
import img19 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.14 PM.jpeg';
import img20 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.16 PM.jpeg';
import img21 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.17 PM.jpeg';
import img22 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.18 PM.jpeg';
import img23 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.20 PM.jpeg';
import img24 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.22 PM.jpeg';
import img25 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.23 PM.jpeg';
import img26 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.25 PM.jpeg';
import img27 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.26 PM.jpeg';
import img28 from '../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.28 PM.jpeg';

const Gallery = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState(null);

  const images = [
    { id: 1, src: img1, title: "Training Session 1" },
    { id: 2, src: img2, title: "Training Session 2" },
    { id: 3, src: img3, title: "Training Session 3" },
    { id: 4, src: img4, title: "Training Session 4" },
    { id: 5, src: img5, title: "Training Session 5" },
    { id: 6, src: img6, title: "Training Session 6" },
    { id: 7, src: img7, title: "Training Session 7" },
    { id: 8, src: img8, title: "Training Session 8" },
    { id: 9, src: img9, title: "Training Session 9" },
    { id: 10, src: img10, title: "Training Session 10" },
    { id: 11, src: img11, title: "Training Session 11" },
    { id: 12, src: img12, title: "Training Session 12" },
    { id: 13, src: img13, title: "Training Session 13" },
    { id: 14, src: img14, title: "Training Session 14" },
    { id: 15, src: img15, title: "Training Session 15" },
    { id: 16, src: img16, title: "Training Session 16" },
    { id: 17, src: img17, title: "Training Session 17" },
    { id: 18, src: img18, title: "Training Session 18" },
    { id: 19, src: img19, title: "Training Session 19" },
    { id: 20, src: img20, title: "Training Session 20" },
    { id: 21, src: img21, title: "Training Session 21" },
    { id: 22, src: img22, title: "Training Session 22" },
    { id: 23, src: img23, title: "Training Session 23" },
    { id: 24, src: img24, title: "Training Session 24" },
    { id: 25, src: img25, title: "Training Session 25" },
    { id: 26, src: img26, title: "Training Session 26" },
    { id: 27, src: img27, title: "Training Session 27" },
    { id: 28, src: img28, title: "Training Session 28" }
  ];

  const openModal = (image) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="gallery-page">
      <PageHero title={t('gallery.title')} subtitle={t('gallery.subtitle')} />
      <div className="container">

        <div className="gallery-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className="gallery-item"
              onClick={() => openModal(image)}
            >
              <img src={image.src} alt={tr('Training Session {{number}}', { number: image.id })} />
              <div className="gallery-overlay">
                <span className="view-icon">🔍</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for full image view */}
      {selectedImage && (
        <div className="gallery-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={closeModal}>&times;</span>
            <img src={selectedImage.src} alt={tr('Training Session {{number}}', { number: selectedImage.id })} />
            <p className="image-title">{tr('Training Session {{number}}', { number: selectedImage.id })}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;

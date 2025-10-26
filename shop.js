// Products and cart data
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Load custom font if set
async function loadCustomFont() {
    try {
        const { data, error } = await supabase
            .from('links')
            .select('url, family')
            .eq('id', 'customFont')
            .single();

        if (error) {
            console.error('Error fetching font settings:', error);
            return;
        }

        if (!data) {
            console.log('No custom font settings found');
            return;
        }

        const { url: fontLink, family: fontFamily } = data;
        console.log('Custom font settings:', fontLink, fontFamily);

        if (fontLink && fontFamily) {
            // Check if font link already exists
            const existingLink = document.querySelector(`link[href="${fontLink}"]`);
            if (!existingLink) {
                // Create and add the link element for Google Fonts
                const linkElement = document.createElement('link');
                linkElement.rel = 'stylesheet';
                linkElement.href = fontLink;
                document.head.appendChild(linkElement);
            }

            // Apply the font family to body
            document.body.style.fontFamily = fontFamily;
        }
    } catch (err) {
        console.error('Error loading custom font:', err);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(animateBand, 1000);
    // Load custom hero background from Supabase Storage
    try {
        const bucketName = "product-images";

        // List all files in the bucket
        const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list("", {
                limit: 100,
                sortBy: { column: "created_at", order: "desc" },
            });

        if (listError) {
            console.log("Error listing files:", listError);
            return;
        }

        // Find the hero background file (starts with 'hero-background')
        const heroFile = files?.find((file) =>
            file.name.startsWith("hero-background")
        );

        if (!heroFile) {
            console.log("No hero background file found");
            return;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(heroFile.name);

        if (!urlData?.publicUrl) {
            return;
        }

        const heroBackgroundUrl = urlData.publicUrl;

        // Determine if it's a video based on file extension
        const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(heroFile.name);
        const heroSection = document.querySelector(".hero-section");

        if (heroSection) {
            if (isVideo) {
                // Create video background
                const video = document.createElement("video");
                video.src = heroBackgroundUrl;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
              `;
                heroSection.insertBefore(video, heroSection.firstChild);
            } else {
                // Set image background
                heroSection.style.backgroundImage = `url('${heroBackgroundUrl}')`;
                heroSection.style.backgroundSize = "cover";
                heroSection.style.backgroundPosition = "center";
                heroSection.style.backgroundRepeat = "no-repeat";
            }

            // Darken overlay for better text visibility
            const overlay = heroSection.querySelector(".hero-overlay");
            if (overlay) {
                overlay.style.background = "rgba(0, 0, 0, 0.4)";
            }
        }
    } catch (err) {
        console.error("Error loading hero background:", err);
    }
    await loadCustomFont();
    await loadProducts();
    await loadProductShowcase();
    await loadComments();
    updateCartUI();

    const productsPrev = document.getElementById('productsPrev');
    const productsNext = document.getElementById('productsNext');

    if (productsPrev) {
        productsPrev.addEventListener('click', productsCarouselPrev);
    }
    if (productsNext) {
        productsNext.addEventListener('click', productsCarouselNext);
    }

    // Touch support for products carousel
    const productsWrapper = document.querySelector('.products-carousel-wrapper');
    if (productsWrapper) {
        let touchStartX = 0;
        let touchEndX = 0;

        productsWrapper.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        productsWrapper.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            const swipeThreshold = 50;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    productsCarouselNext();
                } else {
                    productsCarouselPrev();
                }
            }
        }, { passive: true });
    };



    const carouselContainer = document.querySelector('.carousel-container');

    if (carouselContainer) {
        // Touch events for carousel
        let carouselTouchStartX = 0;
        let carouselTouchEndX = 0;

        carouselContainer.addEventListener('touchstart', (e) => {
            carouselTouchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselContainer.addEventListener('touchend', (e) => {
            carouselTouchEndX = e.changedTouches[0].screenX;
            const diff = carouselTouchStartX - carouselTouchEndX;
            const swipeThreshold = 50;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    carouselNext();
                } else {
                    carouselPrev();
                }
            }
        }, { passive: true });

        // Mouse events for desktop drag
        let isDragging = false;
        let startX = 0;

        carouselContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            carouselContainer.style.cursor = 'grabbing';
        });

        carouselContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });

        carouselContainer.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            carouselContainer.style.cursor = 'grab';

            const endX = e.clientX;
            const diff = startX - endX;

            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    carouselNext();
                } else {
                    carouselPrev();
                }
            }
        });

        carouselContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            carouselContainer.style.cursor = 'grab';
        });
    };
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', () => {
            clearInterval(carouselInterval);
        });
        carouselContainer.addEventListener('mouseleave', () => {
            startAutoPlay();
        });
    }
    // Cart button event
    document.getElementById('cartButton').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.add('active');
    });

    // Close cart button
    document.getElementById('closeCart').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.remove('active');
    });

    // Subscribe to real-time product updates
    subscribeToProducts();
});

// Subscribe to real-time product changes
function subscribeToProducts() {
    supabase
        .channel('products-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Product change detected:', payload);
                loadProducts(); // Reload products when changes occur
            }
        )
        .subscribe();
}
// Load comments from Supabase
async function loadComments() {
    const commentsList = document.getElementById('cmt-list');
    try {
        // Show loading state
        commentsList.innerHTML = '<p style="text-align: center; color: #666;">Yorumlar yükleniyor...</p>';
        // Fetch comments from Supabase
        const comments = await db.getComments();
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: #666;">Henüz yorum bulunmamaktadır.</p>';
            return;
        }
        commentsList.innerHTML = comments.map(comment => `
            <div class="cmt-card">
                <div class="cmt-header">
                    <strong>${comment.name || 'Anonim'}</strong>
                    <span>${'⭐'.repeat(comment.stars || 0)}</span>
                </div>
                <div class="cmt-body">${comment.body}</div>
                <div class="cmt-date">${new Date(comment.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');

        // Initialize carousel after loading comments
        initCarousel();
        createIndicators();
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p style="text-align: center; color: #d32f2f;">❌ Yorumlar yüklenirken hata oluştu.</p>';
    }
}

// Carousel functionality
let currentSlide = 0;
let carouselInterval;
const slideDelay = 5000; // Auto-play delay (5 seconds)

function initCarousel() {
    const commentsList = document.getElementById('cmt-list');
    const cards = commentsList.querySelectorAll('.cmt-card');

    if (cards.length === 0) return;

    // Show carousel buttons only if there are comments
    document.querySelectorAll('.carousel-btn').forEach(btn => {
        btn.style.display = cards.length > 0 ? 'flex' : 'none';
    });

    updateCarousel();
    startAutoPlay();
}

function updateCarousel() {
    const commentsList = document.getElementById('cmt-list');
    const cards = commentsList.querySelectorAll('.cmt-card');
    const isMobile = window.innerWidth <= 768;

    if (cards.length === 0) return;

    // Calculate slides per view (3 on desktop, 1 on mobile)
    const slidesPerView = isMobile ? 1 : 3;
    const maxSlide = Math.max(0, cards.length - slidesPerView);

    // Keep current slide in bounds
    if (currentSlide > maxSlide) {
        currentSlide = maxSlide;
    }

    // Calculate transform
    const cardWidth = cards[0].offsetWidth;
    const gap = 20;
    const offset = currentSlide * (cardWidth + gap);

    commentsList.style.transform = `translateX(-${offset}px)`;

    updateIndicators();
}

function carouselNext() {
    const commentsList = document.getElementById('cmt-list');
    const cards = commentsList.querySelectorAll('.cmt-card');
    const isMobile = window.innerWidth <= 768;
    const slidesPerView = isMobile ? 1 : 3;
    const maxSlide = Math.max(0, cards.length - slidesPerView);

    currentSlide = (currentSlide + 1) > maxSlide ? 0 : currentSlide + 1;
    updateCarousel();
    resetAutoPlay();
}

function carouselPrev() {
    const commentsList = document.getElementById('cmt-list');
    const cards = commentsList.querySelectorAll('.cmt-card');
    const isMobile = window.innerWidth <= 768;
    const slidesPerView = isMobile ? 1 : 3;
    const maxSlide = Math.max(0, cards.length - slidesPerView);

    currentSlide = (currentSlide - 1) < 0 ? maxSlide : currentSlide - 1;
    updateCarousel();
    resetAutoPlay();
}

function createIndicators() {
    const commentsList = document.getElementById('cmt-list');
    const cards = commentsList.querySelectorAll('.cmt-card');
    const indicatorsContainer = document.getElementById('indicators');
    const isMobile = window.innerWidth <= 768;
    const slidesPerView = isMobile ? 1 : 3;

    if (cards.length === 0) {
        indicatorsContainer.innerHTML = '';
        return;
    }

    const numIndicators = Math.max(1, cards.length - slidesPerView + 1);

    indicatorsContainer.innerHTML = Array.from({ length: numIndicators }, (_, i) =>
        `<button class="indicator ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
    ).join('');
}

function updateIndicators() {
    const indicators = document.querySelectorAll('.indicator');
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
    resetAutoPlay();
}

function startAutoPlay() {
    carouselInterval = setInterval(() => {
        carouselNext();
    }, slideDelay);
}

function resetAutoPlay() {
    clearInterval(carouselInterval);
    startAutoPlay();
}

// Update carousel on window resize
window.addEventListener('resize', () => {
    updateCarousel();
    createIndicators();
});

function animateBand() {
    const shopBand = document.querySelector('.shop-band');
    const shopBandContent = document.querySelector('.shop-band-content');
    const items = shopBandContent.querySelectorAll('p');

    if (!items || items.length === 0) return;

    // Make sure the container is scrollable
    shopBand.style.overflowX = 'auto';
    shopBand.style.scrollbarWidth = 'none'; // Hide scrollbar for Firefox
    shopBand.style.msOverflowStyle = 'none'; // Hide scrollbar for IE/Edge
    // Hide scrollbar for Chrome/Safari
    const style = document.createElement('style');
    style.textContent = '.shop-band::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);

    let currentIndex = 0;

    // Function to calculate dynamic scroll duration based on text length and device
    function getScrollDuration(text) {
        const baseTime = 3000; // Base time in milliseconds
        const isMobile = window.innerWidth <= 768;

        // Calculate extra time based on text length
        // Longer texts need more time to be read
        const textLength = text.length;
        const extraTime = Math.floor(textLength / 10) * 100; // 100ms per 10 characters

        // Mobile devices might need slightly more time
        const platformMultiplier = isMobile ? 1.2 : 1;

        return Math.min((baseTime + extraTime) * platformMultiplier, 8000); // Cap at 8 seconds
    }

    // Function to scroll to a specific item
    function scrollToItem(index) {
        if (index >= items.length) {
            index = 0; // Loop back to start
        }

        const item = items[index];
        if (!item) return;

        // Calculate scroll position to center the item horizontally
        const containerWidth = shopBand.offsetWidth;
        const itemLeft = item.offsetLeft;
        const itemWidth = item.offsetWidth;

        // Calculate the scroll position to center the item
        const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);

        // Scroll the shop-band container
        shopBand.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
        });

        // Calculate dynamic duration based on current item's text
        const duration = getScrollDuration(item.textContent);

        // Schedule next item
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % items.length;
            scrollToItem(currentIndex);
        }, duration);
    }

    // Start the animation
    scrollToItem(0);

    // Pause animation on hover/touch (better UX)
    let isPaused = false;
    let pauseTimeout;

    shopBand.addEventListener('mouseenter', () => {
        isPaused = true;
    });

    shopBand.addEventListener('mouseleave', () => {
        isPaused = false;
    });

    // Touch support for mobile
    shopBand.addEventListener('touchstart', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => {
            isPaused = false;
        }, 3000); // Resume after 3 seconds of no touch
    }, { passive: true });
}

// Load products from Supabase
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');

    try {
        // Show loading state
        productsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">Ürünler yükleniyor...</p>';

        // Fetch products from Supabase
        products = await db.getProducts();

        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">Henüz ürün bulunmamaktadır.</p>';
            return;
        }

        productsGrid.innerHTML = products.map((product, index) => {
            // Check if product has media gallery
            const mediaArray = product.media || (product.image ? [{ url: product.image, type: product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) ? 'video' : 'image', isPrimary: true }] : []);

            let mediaHtml;
            if (mediaArray.length > 1) {
                // Multiple media - create carousel
                const mediaCarouselItems = mediaArray.map((media, mediaIndex) => {
                    const isVideo = media.type === 'video';
                    return isVideo
                        ? `<video src="${media.url}" class="product-media-item clickable-media" data-media-url="${media.url}" data-media-type="video" autoplay loop muted playsinline onerror="this.style.display='none'"></video>`
                        : `<img src="${media.url}" alt="${product.name}" class="product-media-item clickable-media" data-media-url="${media.url}" data-media-type="image" onerror="this.src='assets/100mg.png'">`;
                }).join('');

                const dotsHtml = mediaArray.map((_, dotIndex) =>
                    `<span class="media-dot ${dotIndex === 0 ? 'active' : ''}" onclick="goToMediaSlide(${index}, ${dotIndex})"></span>`
                ).join('');

                mediaHtml = `
                    <div class="product-media-carousel" data-product-index="${index}">
                        <div class="media-carousel-track" data-current-slide="0">
                            ${mediaCarouselItems}
                        </div>
                        ${mediaArray.length > 1 ? `
                        <button class="media-carousel-btn media-prev" onclick="prevMediaSlide(${index})" aria-label="Previous">‹</button>
                        <button class="media-carousel-btn media-next" onclick="nextMediaSlide(${index})" aria-label="Next">›</button>
                        <div class="media-dots">${dotsHtml}</div>
                        ` : ''}
                    </div>
                `;
            } else if (mediaArray.length === 1) {
                // Single media - backward compatible
                const media = mediaArray[0];
                const isVideo = media.type === 'video';
                mediaHtml = isVideo
                    ? `<video src="${media.url}" class="product-image clickable-media" data-media-url="${media.url}" data-media-type="video" autoplay loop muted playsinline onerror="this.style.display='none'"></video>`
                    : `<img src="${media.url}" alt="${product.name}" class="product-image clickable-media" data-media-url="${media.url}" data-media-type="image" onerror="this.src='assets/100mg.png'">`;
            } else {
                // No media - fallback image
                mediaHtml = `<img src="assets/100mg.png" alt="${product.name}" class="product-image">`;
            }

            const originalPrice = product.price * 1.6;

            return `
      <div class="product-card">
        <div class="free-shipping-badge">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path d="M224 0l0 64c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-64 32 0c35.3 0 64 28.7 64 64l0 128c0 5.5-.7 10.9-2 16l-252 0c-1.3-5.1-2-10.5-2-16l0-128c0-35.3 28.7-64 64-64l32 0zm96 512c-11.2 0-21.8-2.9-31-8 9.5-16.5 15-35.6 15-56l0-128c0-20.4-5.5-39.5-15-56 9.2-5.1 19.7-8 31-8l32 0 0 64c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-64 32 0c35.3 0 64 28.7 64 64l0 128c0 35.3-28.7 64-64 64l-128 0zM0 320c0-35.3 28.7-64 64-64l32 0 0 64c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-64 32 0c35.3 0 64 28.7 64 64l0 128c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 320z"/>
        </svg> Kargo Bedava
        </div>
        <div class="discount-badge">%40 İndirim</div>
        ${mediaHtml}
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="price-container">
          <div class="product-price">${product.price.toFixed(2)} ₺</div>
          <div class="original-price">${originalPrice.toFixed(2)} ₺</div>
        </div>
        <div class="product-stock ${product.stock === 0 ? 'out-of-stock' : ''}">
          ${product.stock > 0 ? '' : 'Stokta yok'}
        </div>
        <button 
          class="add-to-cart-btn" 
          onclick="addToCart(${product.id})"
          ${product.stock === 0 ? 'disabled' : ''}
        >
          ${product.stock === 0 ? 'Stokta Yok' : 'Sepete Ekle'}
        </button>
      </div>
    `;
        }).join('');

        // Initialize swipe support for carousels after rendering
        setTimeout(() => initMediaCarouselSwipe(), 100);
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p style="text-align: center; color: #d32f2f; grid-column: 1/-1;">❌ Ürünler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.</p>';
    }
}

// Product media carousel navigation functions
function nextMediaSlide(productIndex) {
    const carousel = document.querySelector(`.product-media-carousel[data-product-index="${productIndex}"]`);
    if (!carousel) return;

    const track = carousel.querySelector('.media-carousel-track');
    const items = track.querySelectorAll('.product-media-item');
    const currentSlide = parseInt(track.dataset.currentSlide);
    const nextSlide = (currentSlide + 1) % items.length;

    updateMediaSlide(productIndex, nextSlide);
}

function prevMediaSlide(productIndex) {
    const carousel = document.querySelector(`.product-media-carousel[data-product-index="${productIndex}"]`);
    if (!carousel) return;

    const track = carousel.querySelector('.media-carousel-track');
    const items = track.querySelectorAll('.product-media-item');
    const currentSlide = parseInt(track.dataset.currentSlide);
    const prevSlide = (currentSlide - 1 + items.length) % items.length;

    updateMediaSlide(productIndex, prevSlide);
}

function goToMediaSlide(productIndex, slideIndex) {
    updateMediaSlide(productIndex, slideIndex);
}

function updateMediaSlide(productIndex, slideIndex) {
    const carousel = document.querySelector(`.product-media-carousel[data-product-index="${productIndex}"]`);
    if (!carousel) return;

    const track = carousel.querySelector('.media-carousel-track');
    const items = track.querySelectorAll('.product-media-item');
    const dots = carousel.querySelectorAll('.media-dot');

    // Update track position
    track.dataset.currentSlide = slideIndex;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;

    // Update dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
}

// Initialize touch swipe support for media carousels
function initMediaCarouselSwipe() {
    document.querySelectorAll('.product-media-carousel').forEach(carousel => {
        let touchStartX = 0;
        let touchEndX = 0;
        const productIndex = parseInt(carousel.dataset.productIndex);

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe(productIndex);
        }, { passive: true });

        function handleSwipe(index) {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next slide
                    nextMediaSlide(index);
                } else {
                    // Swipe right - previous slide
                    prevMediaSlide(index);
                }
            }
        }
    });
}

// Load and populate rotating product showcase
async function loadProductShowcase() {
    const showcaseTrack = document.getElementById('showcaseTrack');
    if (!showcaseTrack) return;

    try {
        // Use already loaded products, or fetch if not available
        const showcaseProducts = products.length > 0 ? products : await db.getProducts();

        if (showcaseProducts.length === 0) {
            showcaseTrack.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Henüz ürün bulunmamaktadır.</p>';
            return;
        }

        // Duplicate products for seamless infinite scroll
        const duplicatedProducts = Array(Math.ceil(10 / showcaseProducts.length)).fill(showcaseProducts).flat();

        const showcaseHtml = duplicatedProducts.map((product, index) => {
            // Get primary media
            const mediaArray = product.media || (product.image ? [{ url: product.image, type: product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) ? 'video' : 'image', isPrimary: true }] : []);
            const primaryMedia = mediaArray.find(m => m.isPrimary) || mediaArray[0] || { url: 'assets/100mg.png', type: 'image' };

            const isVideo = primaryMedia.type === 'video';
            const mediaHtml = isVideo
                ? `<video src="${primaryMedia.url}" class="showcase-item-image" autoplay loop muted playsinline onerror="this.style.display='none'"></video>`
                : `<img src="${primaryMedia.url}" alt="${product.name}" class="showcase-item-image" onerror="this.src='assets/100mg.png'">`;

            // Add badge if stock is low or out
            const badgeHtml = product.stock === 0
                ? '<div class="showcase-item-badge">Stokta Yok</div>'
                : product.stock < 5
                    ? '<div class="showcase-item-badge">Son Ürünler!</div>'
                    : '';

            return `
                <div class="showcase-item" onclick="scrollToProduct(${product.id})">
                    ${badgeHtml}
                    ${mediaHtml}
                    <div class="showcase-item-info">
                        <div class="showcase-item-name">${product.name}</div>
                    </div>
                </div>
            `;
        }).join('');

        showcaseTrack.innerHTML = showcaseHtml;
    } catch (error) {
        console.error('Error loading product showcase:', error);
        showcaseTrack.innerHTML = '<p style="text-align: center; color: #d32f2f; padding: 40px;">❌ Vitrin yüklenirken hata oluştu.</p>';
    }
}

// Scroll to product when showcase item is clicked
function scrollToProduct(productId) {
    const productsSection = document.querySelector('.shop-container');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Highlight the product card briefly
        setTimeout(() => {
            const productCards = document.querySelectorAll('.product-card');
            const productIndex = products.findIndex(p => p.id === productId);
            if (productIndex !== -1 && productCards[productIndex]) {
                productCards[productIndex].style.transition = 'all 0.3s ease';
                productCards[productIndex].style.transform = 'scale(1.05)';
                productCards[productIndex].style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';

                setTimeout(() => {
                    productCards[productIndex].style.transform = '';
                    productCards[productIndex].style.boxShadow = '';
                }, 1000);
            }
        }, 500);
    }
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);

    if (!product || product.stock === 0) {
        alert('Bu ürün stokta yok!');
        return;
    }

    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity++;
        } else {
            alert('Stok miktarını aştınız!');
            return;
        }
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();

    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Eklendi';
    button.style.background = '#4CAF50';

    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 1000);
}

// Update cart quantity
function updateQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    const product = products.find(p => p.id === productId);

    if (cartItem) {
        cartItem.quantity += change;

        if (cartItem.quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (cartItem.quantity > product.stock) {
            alert('Stok miktarını aştınız!');
            cartItem.quantity = product.stock;
        }

        saveCart();
        updateCartUI();
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartFooter = document.getElementById('cartFooter');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Sepetiniz boş</div>';
        cartFooter.style.display = 'none';
        return;
    }

    cartFooter.style.display = 'block';

    cartItems.innerHTML = cart.map(item => {
        // Check if media is a video
        const isVideo = item.image && item.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);

        const mediaHtml = isVideo
            ? `<video src="${item.image}" class="cart-item-image" muted playsinline onerror="this.style.display='none'"></video>`
            : `<img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='assets/100mg.png'">`;

        return `
    <div class="cart-item">
      ${mediaHtml}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price.toFixed(2)} ₺</div>
        <div class="cart-item-quantity">
          <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${item.id})">Kaldır</button>
      </div>
    </div>
  `;
    }).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `${total.toFixed(2)} ₺`;
}

// Save cart to localStorage (cart stays local)
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Checkout function - Redirects to WhatsApp
function checkout() {
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }

    // Get WhatsApp number from config (falls back to default if not set)
    const whatsappNumber = typeof WHATSAPP_CONFIG !== 'undefined'
        ? WHATSAPP_CONFIG.number
        : '905551234567'; // Fallback number

    // Build order message
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create detailed message for WhatsApp
    let message = '*Sipariş Detayları*\n';

    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   Adet: ${item.quantity}\n`;
        message += `   Fiyat: ${item.price.toFixed(2)} ₺\n`;
        message += `   Ara Toplam: ${(item.price * item.quantity).toFixed(2)} ₺\n\n`;
    });

    message += `*Toplam: ${total.toFixed(2)} ₺*\n`;
    message += `Merhaba! Yukarıdaki ürünleri sipariş vermek istiyorum.`;

    // Add custom suffix if configured
    if (typeof WHATSAPP_CONFIG !== 'undefined' && WHATSAPP_CONFIG.messageSuffix) {
        message += WHATSAPP_CONFIG.messageSuffix;
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');

    // Get confirmation delay from config or use default
    const delay = typeof WHATSAPP_CONFIG !== 'undefined'
        ? WHATSAPP_CONFIG.confirmDelay
        : 1000;

    // Show confirmation message
    setTimeout(() => {
        const shouldClear = typeof WHATSAPP_CONFIG !== 'undefined'
            ? WHATSAPP_CONFIG.clearCartAfterRedirect
            : true;

        if (shouldClear && confirm('WhatsApp\'a yönlendirildiniz!\n\nSepetinizi temizlemek ister misiniz?')) {
            // Clear cart
            cart = [];
            saveCart();
            updateCartUI();
            document.getElementById('cartSidebar').classList.remove('active');
        }
    }, delay);
}

// Products Carousel for Mobile
let currentProductSlide = 0;
let productsCarouselInterval;
const productsSlideDelay = 4000;

function initProductsCarousel() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        // Reset on desktop
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.style.transform = '';
        }
        return;
    }

    const productsGrid = document.getElementById('productsGrid');
    const productCards = productsGrid?.querySelectorAll('.product-card');

    if (!productCards || productCards.length === 0) return;

    // Show carousel buttons only on mobile
    document.querySelectorAll('.products-carousel-btn').forEach(btn => {
        btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    });

    createProductsIndicators();
    updateProductsCarousel();
}

function updateProductsCarousel() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const productsGrid = document.getElementById('productsGrid');
    const productCards = productsGrid?.querySelectorAll('.product-card');

    if (!productCards || productCards.length === 0) return;

    // Keep current slide in bounds
    const maxSlide = productCards.length - 1;
    if (currentProductSlide > maxSlide) {
        currentProductSlide = maxSlide;
    }

    // Calculate transform
    const cardWidth = productCards[0].offsetWidth;
    const gap = 20;
    const offset = currentProductSlide * (cardWidth + gap);

    productsGrid.style.transform = `translateX(-${offset}px)`;

    updateProductsIndicators();
}

function productsCarouselNext() {
    const productsGrid = document.getElementById('productsGrid');
    const productCards = productsGrid?.querySelectorAll('.product-card');
    if (!productCards) return;

    const maxSlide = productCards.length - 1;
    currentProductSlide = (currentProductSlide + 1) > maxSlide ? 0 : currentProductSlide + 1;
    updateProductsCarousel();
}

function productsCarouselPrev() {
    const productsGrid = document.getElementById('productsGrid');
    const productCards = productsGrid?.querySelectorAll('.product-card');
    if (!productCards) return;

    const maxSlide = productCards.length - 1;
    currentProductSlide = (currentProductSlide - 1) < 0 ? maxSlide : currentProductSlide - 1;
    updateProductsCarousel();
}

function createProductsIndicators() {
    const productsGrid = document.getElementById('productsGrid');
    const productCards = productsGrid?.querySelectorAll('.product-card');
    const indicatorsContainer = document.getElementById('productsIndicators');

    if (!productCards || !indicatorsContainer) return;

    indicatorsContainer.innerHTML = Array.from({ length: productCards.length }, (_, i) =>
        `<button class="product-indicator ${i === 0 ? 'active' : ''}" onclick="goToProductSlide(${i})"></button>`
    ).join('');
}

function updateProductsIndicators() {
    const indicators = document.querySelectorAll('.product-indicator');
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentProductSlide);
    });
}

function goToProductSlide(index) {
    currentProductSlide = index;
    updateProductsCarousel();
}

// Update carousel on window resize
window.addEventListener('resize', () => {
    initProductsCarousel();
});

// Call initProductsCarousel after products are loaded
const originalLoadProducts = loadProducts;
loadProducts = async function () {
    await originalLoadProducts();
    // Wait a bit for DOM to update
    setTimeout(() => {
        initProductsCarousel();
        initImageLightbox();
    }, 100);
};

// Image Lightbox Functionality
let currentLightboxIndex = 0;
let lightboxMediaArray = [];

function initImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxVideo = document.getElementById('lightboxVideo');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCounter = document.getElementById('lightboxCounter');

    // Add click event to all clickable media
    document.querySelectorAll('.clickable-media').forEach(media => {
        media.style.cursor = 'pointer';
        media.addEventListener('click', function (e) {
            e.stopPropagation();

            // Find all media in the same product card
            const productCard = this.closest('.product-card');
            if (productCard) {
                lightboxMediaArray = Array.from(productCard.querySelectorAll('.clickable-media'));
                currentLightboxIndex = lightboxMediaArray.indexOf(this);
            } else {
                // Single media
                lightboxMediaArray = [this];
                currentLightboxIndex = 0;
            }

            showLightboxMedia(currentLightboxIndex);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateLightboxControls();
        });
    });

    // Show media at specific index
    function showLightboxMedia(index) {
        const media = lightboxMediaArray[index];
        const mediaUrl = media.dataset.mediaUrl;
        const mediaType = media.dataset.mediaType;

        if (mediaType === 'video') {
            lightboxImage.style.display = 'none';
            lightboxVideo.style.display = 'block';
            lightboxVideo.src = mediaUrl;
        } else {
            lightboxVideo.style.display = 'none';
            lightboxImage.style.display = 'block';
            lightboxImage.src = mediaUrl;
        }

        updateLightboxControls();
    }

    // Update navigation controls visibility
    function updateLightboxControls() {
        const hasMultipleMedia = lightboxMediaArray.length > 1;

        if (hasMultipleMedia) {
            lightboxPrev.classList.add('visible');
            lightboxNext.classList.add('visible');
            lightboxCounter.classList.add('visible');
            lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxMediaArray.length}`;
        } else {
            lightboxPrev.classList.remove('visible');
            lightboxNext.classList.remove('visible');
            lightboxCounter.classList.remove('visible');
        }
    }

    // Navigate to previous media
    function showPreviousMedia() {
        currentLightboxIndex = (currentLightboxIndex - 1 + lightboxMediaArray.length) % lightboxMediaArray.length;
        showLightboxMedia(currentLightboxIndex);
    }

    // Navigate to next media
    function showNextMedia() {
        currentLightboxIndex = (currentLightboxIndex + 1) % lightboxMediaArray.length;
        showLightboxMedia(currentLightboxIndex);
    }

    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxImage.src = '';
        lightboxMediaArray = [];
        currentLightboxIndex = 0;
    }

    // Event listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        showPreviousMedia();
    });
    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextMedia();
    });

    // Close on background click
    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (lightbox.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                showPreviousMedia();
            } else if (e.key === 'ArrowRight') {
                showNextMedia();
            }
        }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold && lightboxMediaArray.length > 1) {
            if (diff > 0) {
                // Swipe left - next image
                showNextMedia();
            } else {
                // Swipe right - previous image
                showPreviousMedia();
            }
        }
    }
}


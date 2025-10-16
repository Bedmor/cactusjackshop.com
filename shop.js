// Products and cart data
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadComments();
    updateCartUI();

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

// Pause auto-play when hovering over carousel
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', () => {
            clearInterval(carouselInterval);
        });
        carouselContainer.addEventListener('mouseleave', () => {
            startAutoPlay();
        });
    }
});
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

        productsGrid.innerHTML = products.map(product => {
            // Check if media is a video
            const isVideo = product.image && product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);

            const mediaHtml = isVideo
                ? `<video src="${product.image}" class="product-image" autoplay loop muted playsinline onerror="this.style.display='none'"></video>`
                : `<img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='assets/100mg.png'">`;

            return `
      <div class="product-card">
        ${mediaHtml}
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-price">${product.price.toFixed(2)} ₺</div>
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
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p style="text-align: center; color: #d32f2f; grid-column: 1/-1;">❌ Ürünler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.</p>';
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

// Touch/Swipe support for carousel
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.carousel-container');

    if (carouselContainer) {
        // Touch events
        carouselContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
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
    }
});

function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance for swipe
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped left - go to next
            carouselNext();
        } else {
            // Swiped right - go to previous
            carouselPrev();
        }
    }
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

// Event listeners for products carousel
document.addEventListener('DOMContentLoaded', () => {
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
    }
});

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
    }, 100);
};

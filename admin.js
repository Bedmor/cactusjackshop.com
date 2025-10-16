// Admin password - Change this to your desired password
const ADMIN_PASSWORD = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
// Current editing product ID
let editingProductId = null;
let editingCommentId = null;

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = sessionStorage.getItem('adminLoggedIn');

  if (isLoggedIn === 'true') {
    showAdminPanel();
  }

  // Setup image file input handler
  setupImageUploadHandlers();
});

// Login function
async function login(event) {
  event.preventDefault();

  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  try {
    // Hash the password
    const hashBuffer = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password)
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(typeof (hashedPassword) + " : " + hashedPassword);

    // Now check the password
    if (hashedPassword === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      showAdminPanel();
    } else {
      errorMessage.style.display = 'block';
      document.getElementById('password').value = '';

      // Hide error after 3 seconds
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 3000);
    }
  } catch (error) {
    console.error('Hashing error:', error);
    errorMessage.textContent = 'Şifre kontrolünde hata oluştu';
    errorMessage.style.display = 'block';
  }
}

// Show admin panel
async function showAdminPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  await loadProducts();
  await loadComments();
  await loadStats();
}

// Logout function
function logout() {
  if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
  }
}
// Comment management
function openAddCommentModal() {
  editingCommentId = null;
  document.getElementById('commentModalTitle').textContent = 'Yeni Yorum Ekle';
  document.getElementById('commentForm').reset();
  document.getElementById('commentModal').classList.add('active');
}

async function closeCommentModal() {
  document.getElementById('commentModal').classList.remove('active');
  document.getElementById('commentForm').reset();
  editingCommentId = null;
}
async function loadComments() {
  const tableBody = document.getElementById('commentsTableBody');
  try {
    const comments = await db.getComments();
    if (comments.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
            Henüz yorum bulunmamaktadır.
          </td>
        </tr>
      `;
      return;
    }
    tableBody.innerHTML = comments.map(comment => `
      <tr>
        <td>${comment.name || 'Anonim'}</td>
        <td>${comment.body || ''}</td>
        <td>${'⭐'.repeat(comment.stars || 0)}</td>
        <td>${new Date(comment.created_at).toLocaleString('tr-TR')}</td>
        <td>
          <button class="action-btn edit-btn" onclick="editComment(${comment.id})">Düzenle</button>
          <button class="action-btn delete-btn" onclick="deleteComment(${comment.id})">Sil</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading comments:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #d32f2f;">
          ❌ Yorumlar yüklenirken hata oluştu.
        </td>
      </tr>
    `;
  }
}
async function editComment(commentId) {
  try {
    const comment = await db.getComment(commentId);
    if (!comment) return;
    editingCommentId = commentId;
    document.getElementById('commentModalTitle').textContent = 'Yorumu Düzenle';
    document.getElementById('cmt-author').value = comment.name;
    document.getElementById('cmt-body').value = comment.body;
    document.getElementById('cmt-stars').value = comment.stars || 5;
    document.getElementById('commentModal').classList.add('active');
  } catch (error) {
    console.error('Error editing comment:', error);
    alert('Yorum bilgileri alınırken hata oluştu.');
  }
}
async function deleteComment(commentId) {
  if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
    return;
  }
  try {
    await db.deleteComment(commentId);
    loadComments();
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('Yorum silinirken hata oluştu.');
  }
}
async function saveComment(event) {
  event.preventDefault();
  const name = document.getElementById('cmt-author').value;
  const body = document.getElementById('cmt-body').value;
  const stars = parseInt(document.getElementById('cmt-stars').value) || 0;
  try {
    const commentData = { name, body, stars };
    if (editingCommentId) {
      await db.updateComment(editingCommentId, commentData);
    } else {
      await db.addComment(commentData);
    }
    closeCommentModal();
    loadComments();
  } catch (error) {
    console.error('Error saving comment:', error);
    alert('Yorum kaydedilirken hata oluştu.');
  }
}
// Load statistics
async function loadStats() {
  try {
    const products = await db.getProducts();
    const statsGrid = document.getElementById('statsGrid');

    const totalProducts = products.length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalProducts}</div>
        <div class="stat-label">Toplam Ürün</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${outOfStockProducts}</div>
        <div class="stat-label">Stokta Yok</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load products table
async function loadProducts() {
  try {
    const products = await db.getProducts();
    const tableBody = document.getElementById('productsTableBody');

    if (products.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
            Henüz ürün eklenmemiş. "Yeni Ürün Ekle" butonuna tıklayarak başlayın.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = products.map(product => {
      // Check if media is a video
      const isVideo = product.image && product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);

      const mediaHtml = isVideo
        ? `<video src="${product.image}" class="product-image-small" muted playsinline loop style="cursor: pointer;" onerror="this.style.display='none'"></video>`
        : `<img src="${product.image}" alt="${product.name}" class="product-image-small" onerror="this.src='assets/100mg.png'">`;

      return `
      <tr>
        <td>
          ${mediaHtml}
        </td>
        <td>${product.name}</td>
        <td>${product.description}</td>
        <td>${product.price.toFixed(2)} ₺</td>
        <td style="color: ${product.stock < 10 ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">
          ${product.stock} adet
        </td>
        <td>
          <button class="action-btn edit-btn" onclick="editProduct(${product.id})">Düzenle</button>
          <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">Sil</button>
        </td>
      </tr>
    `;
    }).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #d32f2f;">
          ❌ Ürünler yüklenirken hata oluştu. Supabase bağlantınızı kontrol edin.
        </td>
      </tr>
    `;
  }
}

// Setup image/video upload handlers
function setupImageUploadHandlers() {
  const fileInput = document.getElementById('productImageFile');
  const urlInput = document.getElementById('productImage');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const previewVideo = document.getElementById('previewVideo');

  // File input change handler
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');

      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isVideo) {
          // Show video preview
          previewVideo.src = event.target.result;
          previewVideo.style.display = 'block';
          previewImg.style.display = 'none';
        } else {
          // Show image preview
          previewImg.src = event.target.result;
          previewImg.style.display = 'block';
          previewVideo.style.display = 'none';
        }
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);

      // Clear URL input since we're using file
      urlInput.value = '';
    }
  });

  // URL input handler - show preview
  urlInput?.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url) {
      // Check if URL is a video
      const isVideo = url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);

      if (isVideo) {
        previewVideo.src = url;
        previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
      } else {
        previewImg.src = url;
        previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
      }
      imagePreview.style.display = 'block';
      // Clear file input
      fileInput.value = '';
    }
  });
}

// Open add product modal
function openAddProductModal() {
  editingProductId = null;
  document.getElementById('modalTitle').textContent = 'Yeni Ürün Ekle';
  document.getElementById('productForm').reset();
  document.getElementById('productModal').classList.add('active');
}

// Edit product
async function editProduct(productId) {
  try {
    const product = await db.getProduct(productId);

    if (!product) return;

    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Ürünü Düzenle';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image;

    // Show image/video preview if exists
    if (product.image) {
      const previewImg = document.getElementById('previewImg');
      const previewVideo = document.getElementById('previewVideo');
      const isVideo = product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);

      if (isVideo) {
        previewVideo.src = product.image;
        previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
      } else {
        previewImg.src = product.image;
        previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
      }
      document.getElementById('imagePreview').style.display = 'block';
    }

    document.getElementById('productModal').classList.add('active');
  } catch (error) {
    console.error('Error editing product:', error);
    alert('❌ Ürün bilgileri alınırken hata oluştu.');
  }
}

// Delete product
async function deleteProduct(productId) {
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
    return;
  }

  try {
    // Get product to delete its image
    const product = await db.getProduct(productId);

    // Delete product from database
    await db.deleteProduct(productId);

    // Delete image from storage if it's a Supabase image
    if (product && product.image && typeof storageHelper !== 'undefined') {
      await storageHelper.deleteImage(product.image);
    }

    await loadProducts();
    await loadStats();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('❌ Ürün silinirken hata oluştu.');
  }
}

// Save product (add or update)
async function saveProduct(event) {
  event.preventDefault();

  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);
  let imageUrl = document.getElementById('productImage').value;
  const imageFile = document.getElementById('productImageFile')?.files[0];

  try {
    // Upload image if file is selected
    if (imageFile && typeof storageHelper !== 'undefined') {
      showUploadProgress(true);

      try {
        // If editing, get old product to delete old image
        if (editingProductId) {
          const oldProduct = await db.getProduct(editingProductId);
          if (oldProduct && oldProduct.image) {
            await storageHelper.deleteImage(oldProduct.image);
          }
        }

        // Upload new image with compression
        imageUrl = await storageHelper.uploadCompressedImage(
          imageFile,
          editingProductId || 'new'
        );

        showUploadProgress(false);
      } catch (uploadError) {
        showUploadProgress(false);
        throw new Error('Resim yüklenirken hata: ' + uploadError.message);
      }
    }

    // Validate image URL
    if (!imageUrl) {
      throw new Error('Lütfen bir resim dosyası seçin veya URL girin');
    }

    const productData = {
      name,
      description,
      price,
      stock,
      image: imageUrl
    };

    if (editingProductId) {
      // Update existing product
      await db.updateProduct(editingProductId, productData);
    } else {
      // Add new product
      await db.addProduct(productData);
    }

    closeModal();
    await loadProducts();
    await loadStats();
  } catch (error) {
    console.error('Error saving product:', error);
    alert('❌ ' + error.message);
  }
}

// Show/hide upload progress
function showUploadProgress(show) {
  const progressDiv = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  if (show) {
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = 'Resim yükleniyor...';

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressBar.style.width = progress + '%';
      if (progress >= 90) {
        clearInterval(interval);
      }
    }, 100);
  } else {
    progressBar.style.width = '100%';
    progressText.textContent = 'Tamamlandı!';
    setTimeout(() => {
      progressDiv.style.display = 'none';
    }, 500);
  }
}

// Close modal
function closeModal() {
  document.getElementById('productModal').classList.remove('active');
  document.getElementById('productForm').reset();
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('previewVideo').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  editingProductId = null;
}

// Close modal when clicking outside
document.getElementById('productModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'productModal') {
    closeModal();
  }
});

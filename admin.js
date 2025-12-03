// Admin password - SHA-256 hash of "Fg.Sakarya.72"
const ADMIN_PASSWORD = "52ad5d996e8ee34811206346277ef2fedd7236d6f5009256ab337f57c5f39a20";
// Current editing product ID
let editingProductId = null;
let editingCommentId = null;
// Product media gallery
let productMediaGallery = [];

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
  await loadOrders();
  await loadStats();
  updateHeroBackgroundStatus();
  updateFontStatus();
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
      <td colspan="5" style="text-align: center; padding: 40px; color: var(--danger);">
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

// Load orders from database
async function loadOrders() {
  const tableBody = document.getElementById('ordersTableBody');
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
            Henüz sipariş bulunmamaktadır.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = orders.map(order => {
      const date = new Date(order.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const itemsList = order.items.map(item =>
        `${item.product_name} (${item.quantity}x)`
      ).join(', ');

      const statusColors = {
        'pending': 'var(--warning)',
        'completed': 'var(--success)',
        'cancelled': 'var(--danger)'
      };

      const statusLabels = {
        'pending': 'Beklemede',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi'
      };

      return `
        <tr>
          <td>#${order.id}</td>
          <td>${date}</td>
          <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsList}">
            ${itemsList}
          </td>
          <td><strong>${order.total_amount.toFixed(2)} ₺</strong></td>
          <td>
            <span style="background: ${statusColors[order.status]}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.9rem;">
              ${statusLabels[order.status]}
            </span>
          </td>
          <td>
            <button class="icon-btn" onclick="viewOrderDetails(${order.id})" title="Detayları Gör">
              👁️
            </button>
            <select onchange="updateOrderStatus(${order.id}, this.value)" style="margin-left: 10px;">
              <option value="">Durum Değiştir</option>
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Beklemede</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>İptal Edildi</option>
            </select>
            <button class="icon-btn delete" onclick="deleteOrder(${order.id})" title="Sil">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
    tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
          ❌ Siparişler yüklenirken hata oluştu.
        </td>
      </tr>
    `;
  }
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    const date = new Date(order.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsHtml = order.items.map(item => `
      <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
        <strong>${item.product_name}</strong><br>
        Adet: ${item.quantity}<br>
        Fiyat: ${item.price.toFixed(2)} ₺<br>
        Ara Toplam: ${item.subtotal.toFixed(2)} ₺
      </div>
    `).join('');

    const statusLabels = {
      'pending': 'Beklemede',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };

    alert(`Sipariş Detayları\n\nSipariş No: #${order.id}\nTarih: ${date}\nDurum: ${statusLabels[order.status]}\n\nÜrünler:\n${order.items.map(item => `- ${item.product_name} (${item.quantity}x) = ${item.subtotal.toFixed(2)} ₺`).join('\n')}\n\nToplam: ${order.total_amount.toFixed(2)} ₺`);
  } catch (error) {
    console.error('Error loading order details:', error);
    alert('Sipariş detayları yüklenirken hata oluştu.');
  }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;

  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;

    alert('Sipariş durumu güncellendi!');
    loadOrders();
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Sipariş durumu güncellenirken hata oluştu.');
  }
}

// Delete order
async function deleteOrder(orderId) {
  if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) return;

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;

    alert('Sipariş silindi!');
    loadOrders();
  } catch (error) {
    console.error('Error deleting order:', error);
    alert('Sipariş silinirken hata oluştu.');
  }
}

// Load statistics
async function loadStats() {
  try {
    const products = await db.getProducts();
    const statsGrid = document.getElementById('statsGrid');
    const storageStats = await storageHelper.getStorageStats();

    // Get orders count
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*');

    const totalOrders = orders ? orders.length : 0;
    const pendingOrders = orders ? orders.filter(o => o.status === 'pending').length : 0;

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
      <div class="stat-card">
        <div class="stat-value">${totalOrders}</div>
        <div class="stat-label">Toplam Sipariş</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${pendingOrders}</div>
        <div class="stat-label">Bekleyen Sipariş</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${storageStats.totalSizeMB}</div>
        <div class="stat-label">Toplam Depolama Alanı (MB)</div>
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
        ? `<video src="${product.image}" class="product-image-small" muted controls playsinline loop style="cursor: pointer;" onerror="this.style.display='none'"></video>`
        : `<img src="${product.image}" alt="${product.name}" class="product-image-small" onerror="this.src='assets/100mg.png'">`;

      return `
      <tr>
        <td>
          ${mediaHtml}
        </td>
        <td>${product.name}</td>
        <td>${product.description}</td>
        <td>${product.price.toFixed(2)} ₺</td>
        <td style="color: ${product.stock < 10 ? 'var(--danger)' : '#2e7d32'}; font-weight: bold;">
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
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
          ❌ Ürünler yüklenirken hata oluştu. Supabase bağlantınızı kontrol edin.
        </td>
      </tr>
    `;
  }
}

// Setup image/video upload handlers
function setupImageUploadHandlers() {
  const multiFileInput = document.getElementById('productMediaFiles');
  const mediaGalleryPreview = document.getElementById('mediaGalleryPreview');
  const mediaGalleryGrid = document.getElementById('mediaGalleryGrid');

  // Multiple files input change handler
  multiFileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    mediaGalleryPreview.style.display = 'block';

    // Preview all selected files
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();

      reader.onload = (event) => {
        // Add to gallery array
        productMediaGallery.push({
          file: file,
          url: event.target.result,
          type: isVideo ? 'video' : 'image',
          isPrimary: productMediaGallery.length === 0 // First one is primary
        });

        renderMediaGallery();
      };

      reader.readAsDataURL(file);
    }

    // Clear input so same files can be selected again
    e.target.value = '';
  });
}

function renderMediaGallery() {
  const mediaGalleryGrid = document.getElementById('mediaGalleryGrid');
  const mediaGalleryPreview = document.getElementById('mediaGalleryPreview');

  if (productMediaGallery.length === 0) {
    mediaGalleryPreview.style.display = 'none';
    return;
  }

  mediaGalleryPreview.style.display = 'block';

  mediaGalleryGrid.innerHTML = productMediaGallery.map((media, index) => `
    <div class="media-gallery-item" style="
      position: relative;
      border: 3px solid ${media.isPrimary ? 'var(--primary)' : '#ddd'};
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 1;
      cursor: grab;
    " draggable="true" ondragstart="dragStartMedia(event, ${index})" ondragover="dragOverMedia(event)" ondrop="dropMedia(event, ${index})">
      ${media.type === 'video'
      ? `<video src="${media.url}" style="width: 100%; height: 100%; object-fit: cover;" muted controls></video>`
      : `<img src="${media.url}" style="width: 100%; height: 100%; object-fit: cover;" />`
    }
      ${media.isPrimary ? '<div style="position: absolute; top: 5px; left: 5px; background: var(--primary); color: var(--dark-brown); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">ANA</div>' : ''}
      <button onclick="removeMediaItem(${index})" style="
        position: absolute;
        top: 5px;
        right: 5px;
        background: var(--danger);
        color: white;
        border: none;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
      ">×</button>
      <button onclick="setPrimaryMedia(${index})" style="
        position: absolute;
        bottom: 5px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 0.7rem;
        ${media.isPrimary ? 'display: none;' : ''}
      ">Ana Yap</button>
    </div>
  `).join('');
}

function removeMediaItem(index) {
  productMediaGallery.splice(index, 1);
  // If removed item was primary, make first item primary
  if (productMediaGallery.length > 0 && !productMediaGallery.some(m => m.isPrimary)) {
    productMediaGallery[0].isPrimary = true;
  }
  renderMediaGallery();
}

function setPrimaryMedia(index) {
  productMediaGallery.forEach((media, i) => {
    media.isPrimary = (i === index);
  });
  renderMediaGallery();
}

// Drag and drop functions for reordering
let draggedMediaIndex = null;

function dragStartMedia(event, index) {
  draggedMediaIndex = index;
  event.dataTransfer.effectAllowed = 'move';
}

function dragOverMedia(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function dropMedia(event, dropIndex) {
  event.preventDefault();
  if (draggedMediaIndex === null || draggedMediaIndex === dropIndex) return;

  // Reorder array
  const draggedItem = productMediaGallery[draggedMediaIndex];
  productMediaGallery.splice(draggedMediaIndex, 1);
  productMediaGallery.splice(dropIndex, 0, draggedItem);

  draggedMediaIndex = null;
  renderMediaGallery();
}

// Open add product modal
function openAddProductModal() {
  editingProductId = null;
  productMediaGallery = [];
  document.getElementById('modalTitle').textContent = 'Yeni Ürün Ekle';
  document.getElementById('productForm').reset();
  document.getElementById('mediaGalleryPreview').style.display = 'none';
  document.getElementById('productModal').classList.add('active');
}

// Edit product
async function editProduct(productId) {
  try {
    const product = await db.getProduct(productId);

    if (!product) return;

    editingProductId = productId;
    productMediaGallery = [];

    document.getElementById('modalTitle').textContent = 'Ürünü Düzenle';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;

    // Load existing media gallery
    if (product.media && Array.isArray(product.media) && product.media.length > 0) {
      productMediaGallery = product.media.map(mediaItem => ({
        url: mediaItem.url,
        type: mediaItem.type || (mediaItem.url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) ? 'video' : 'image'),
        isPrimary: mediaItem.isPrimary || false,
        isExisting: true // Mark as existing (not a new file)
      }));
      renderMediaGallery();
    } else if (product.image) {
      // Fallback to old single image format
      const isVideo = product.image.match(/\.(mp4|webm|mov|ogg)(\?|$)/i);
      productMediaGallery = [{
        url: product.image,
        type: isVideo ? 'video' : 'image',
        isPrimary: true,
        isExisting: true
      }];
      renderMediaGallery();
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
    // Get product to delete its media
    const product = await db.getProduct(productId);

    if (product && typeof storageHelper !== 'undefined') {
      // Delete all media files from storage
      const mediaToDelete = [];

      // Add media from media gallery array
      if (product.media && Array.isArray(product.media)) {
        product.media.forEach(mediaItem => {
          if (mediaItem.url) {
            mediaToDelete.push(mediaItem.url);
          }
        });
      }

      // Add old single image field (for backward compatibility)
      if (product.image && !mediaToDelete.includes(product.image)) {
        mediaToDelete.push(product.image);
      }

      // Delete all unique media URLs
      const uniqueMediaUrls = [...new Set(mediaToDelete)];
      console.log(`Deleting ${uniqueMediaUrls.length} media file(s) for product ${productId}`);

      for (const url of uniqueMediaUrls) {
        try {
          await storageHelper.deleteImage(url);
          console.log(`Deleted media: ${url}`);
        } catch (deleteError) {
          console.error(`Failed to delete media ${url}:`, deleteError);
          // Continue deleting other files even if one fails
        }
      }
    }

    // Delete product from database
    await db.deleteProduct(productId);

    await loadProducts();
    await loadStats();

    alert('✅ Ürün ve tüm medya dosyaları başarıyla silindi.');
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('❌ Ürün silinirken hata oluştu: ' + error.message);
  }
}

// Save product (add or update)
async function saveProduct(event) {
  event.preventDefault();

  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);

  try {
    if (productMediaGallery.length === 0) {
      throw new Error('Lütfen en az bir medya dosyası ekleyin');
    }

    showUploadProgress(true);

    // Upload new media files
    const uploadedMedia = [];
    for (let i = 0; i < productMediaGallery.length; i++) {
      const media = productMediaGallery[i];

      if (media.isExisting) {
        // Keep existing media
        uploadedMedia.push({
          url: media.url,
          type: media.type,
          isPrimary: media.isPrimary
        });
      } else if (media.file) {
        // Upload new file
        try {
          const url = await storageHelper.uploadCompressedImage(
            media.file,
            `${editingProductId || 'new'}-${i}`
          );
          uploadedMedia.push({
            url: url,
            type: media.type,
            isPrimary: media.isPrimary
          });
        } catch (uploadError) {
          throw new Error(`Medya yüklenirken hata (${i + 1}): ` + uploadError.message);
        }
      }
    }

    showUploadProgress(false);

    // Find primary media or use first one
    const primaryMedia = uploadedMedia.find(m => m.isPrimary) || uploadedMedia[0];

    const productData = {
      name,
      description,
      price,
      stock,
      image: primaryMedia.url, // Backward compatibility
      media: uploadedMedia
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
    showUploadProgress(false);
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
  document.getElementById('mediaGalleryPreview').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  productMediaGallery = [];
  editingProductId = null;
}

// Close modal when clicking outside
document.getElementById('productModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'productModal') {
    closeModal();
  }
});

// Hero Background Settings
async function previewHeroBackground(event) {
  const file = event.target.files[0];
  const previewDiv = document.getElementById('heroBackgroundPreview');

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        previewDiv.innerHTML = `
          <video src="${e.target.result}" controls style="max-width: 100%; max-height: 300px; border-radius: 8px;">
            Tarayıcınız video etiketini desteklemiyor.
          </video>
        `;
      } else {
        previewDiv.innerHTML = `
          <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;" />
        `;
      }
    };
    reader.readAsDataURL(file);
  }
}

async function saveHeroSettings(event) {
  event.preventDefault();

  const fileInput = document.getElementById('heroBackground');
  const file = fileInput.files[0];

  if (!file) {
    alert('Lütfen bir resim veya video seçin!');
    return;
  }

  try {
    // Show progress
    const submitBtn = event.target.querySelector('.save-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Yükleniyor...';
    submitBtn.disabled = true;

    // Upload to storage
    const { url, isVideo } = await uploadHeroBackground(file);

    submitBtn.textContent = '✓ Kaydedildi!';
    submitBtn.style.background = 'var(--success)';

    // Update status display
    await updateHeroBackgroundStatus();

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = '';
      submitBtn.disabled = false;

      // Clear preview
      document.getElementById('heroBackgroundPreview').innerHTML = '';
      fileInput.value = '';

      alert('Hero arkaplanı başarıyla güncellendi! Ana sayfayı yenileyerek görüntüleyebilirsiniz.');
    }, 2000);

  } catch (error) {
    console.error('Error saving hero background:', error);
    alert('Arkaplan kaydedilemedi: ' + error.message);

    const submitBtn = event.target.querySelector('.save-btn');
    submitBtn.textContent = 'Arkaplanı Kaydet';
    submitBtn.disabled = false;
  }
}

async function uploadHeroBackground(file) {
  const isVideo = file.type.startsWith('video/');
  const fileExt = file.name.split('.').pop();
  const fileName = `hero-background-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Check if bucket exists, if not use product-images bucket
  const bucketName = 'product-images'; // Using existing bucket

  try {
    // First, delete all existing hero backgrounds
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
    } else if (existingFiles && existingFiles.length > 0) {
      // Find all hero background files
      const heroFiles = existingFiles.filter(file => file.name.startsWith('hero-background'));

      if (heroFiles.length > 0) {
        const fileNames = heroFiles.map(f => f.name);
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove(fileNames);

        if (deleteError) {
          console.error('Error deleting old hero backgrounds:', deleteError);
        } else {
          console.log(`Deleted ${fileNames.length} old hero background(s)`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old hero backgrounds:', error);
    // Continue with upload even if deletion fails
  }

  if (!isVideo) {
    // Compress image before upload
    const compressedFile = await storageHelper.compressImage(file);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { url: publicUrl, isVideo: false };
  } else {
    // Upload video as is (or with compression if needed)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { url: publicUrl, isVideo: true };
  }
}

async function removeHeroBackground() {
  if (confirm('Hero arkaplanını kaldırmak istediğinize emin misiniz? Gradyan arkaplan kullanılacak.')) {
    try {
      const bucketName = 'product-images';

      // List all files to find hero background
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) throw listError;

      // Find and delete hero background file
      const heroFile = files?.find(file => file.name.startsWith('hero-background'));

      if (heroFile) {
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([heroFile.name]);

        if (deleteError) throw deleteError;
      }

      await updateHeroBackgroundStatus();
      alert('Hero arkaplanı kaldırıldı! Ana sayfayı yenileyerek görüntüleyebilirsiniz.');
    } catch (error) {
      console.error('Error removing hero background:', error);
      alert('Hero arkaplanı kaldırılırken bir hata oluştu: ' + error.message);
    }
  }
}

async function updateHeroBackgroundStatus() {
  try {
    const bucketName = 'product-images';

    // List all files to find hero background
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) throw listError;

    const statusElement = document.getElementById('heroBackgroundStatus');

    // Find hero background file
    const heroFile = files?.find(file => file.name.startsWith('hero-background'));

    if (heroFile) {
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(heroFile.name);

      const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(heroFile.name);
      const mediaType = isVideo ? '📹 Video' : '🖼️ Resim';
      statusElement.innerHTML = `${mediaType} <a href="${urlData.publicUrl}" target="_blank" style="color: var(--primary);">Görüntüle</a>`;
    } else {
      statusElement.textContent = 'Gradyan (Varsayılan)';
    }
  } catch (error) {
    console.error('Error fetching hero background status:', error);
    const statusElement = document.getElementById('heroBackgroundStatus');
    statusElement.textContent = 'Gradyan (Varsayılan)';
  }
}

async function updateFontStatus() {
  try {
    const { data, error } = await supabase
      .from('links')
      .select('url, family')
      .eq('id', 'customFont')
      .single();

    const statusElement = document.getElementById('fontStatus');

    if (data && data.url && data.family) {
      statusElement.innerHTML = `📝 ${data.family} <small style="color: #666; display: block; margin-top: 5px;">${data.url}</small>`;
    } else {
      statusElement.textContent = 'Varsayılan (Oswald, Oxygen)';
    }
  } catch (error) {
    console.error('Error fetching font status:', error);
    const statusElement = document.getElementById('fontStatus');
    statusElement.textContent = 'Varsayılan (Oswald, Oxygen)';
  }
}

// Font Settings Functions
async function saveFontSettings(event) {
  event.preventDefault();

  const fontLink = document.getElementById('googleFontLink').value.trim();
  const fontFamily = document.getElementById('fontFamily').value.trim();

  if (!fontLink || !fontFamily) {
    alert('Lütfen hem Google Fonts linkini hem de font ailesi adını girin.');
    return;
  }

  // Validate Google Fonts URL
  if (!fontLink.includes('fonts.googleapis.com')) {
    alert('Lütfen geçerli bir Google Fonts linki girin.');
    return;
  }

  try {
    // Save to Supabase
    const { data, error } = await supabase.from('links').upsert({
      id: 'customFont',
      url: fontLink,
      family: fontFamily
    });

    if (error) throw error;

    await updateFontStatus();
    alert('Font ayarları kaydedildi! Ana sayfayı yenileyerek değişiklikleri görüntüleyebilirsiniz.');

    // Clear form
    document.getElementById('fontSettingsForm').reset();
  } catch (error) {
    console.error('Font kaydetme hatası:', error);
    alert('Font kaydedilirken bir hata oluştu: ' + error.message);
  }
}

async function removeCustomFont() {
  if (confirm('Özel fontu kaldırıp varsayılan fonta dönmek istediğinizden emin misiniz?')) {
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', 'customFont');

      if (error) throw error;

      await updateFontStatus();
      alert('Özel font kaldırıldı! Ana sayfayı yenileyerek varsayılan fontu görüntüleyebilirsiniz.');
    } catch (error) {
      console.error('Error removing custom font:', error);
      alert('Font kaldırılırken bir hata oluştu: ' + error.message);
    }
  }
}




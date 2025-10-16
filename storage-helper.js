// Supabase Storage Helper Functions
// Handles image uploads, deletes, and retrieval

const storageHelper = {
    bucketName: 'product-images',

    /**
     * Upload an image file to Supabase Storage
     * @param {File} file - The image file to upload
     * @param {string} productId - Product ID for naming (or 'new')
     * @returns {Promise<string>} - Public URL of uploaded image
     */
    async uploadImage(file, productId = 'new') {
        try {
            // Validate file
            if (!file) {
                throw new Error('No file provided');
            }

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('Image must be smaller than 5MB');
            }

            // Generate unique filename
            const timestamp = Date.now();
            const extension = file.name.split('.').pop();
            const fileName = `product-${productId}-${timestamp}.${extension}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },

    /**
     * Delete an image from Supabase Storage
     * @param {string} imageUrl - Full URL of the image to delete
     * @returns {Promise<boolean>} - Success status
     */
    async deleteImage(imageUrl) {
        try {
            if (!imageUrl) return false;

            // Extract filename from URL
            const fileName = this.extractFileNameFromUrl(imageUrl);
            if (!fileName) return false;

            // Delete from Supabase Storage
            const { error } = await supabase.storage
                .from(this.bucketName)
                .remove([fileName]);

            if (error) {
                console.error('Delete error:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    },

    /**
     * Extract filename from Supabase Storage URL
     * @param {string} url - Full URL of the image
     * @returns {string} - Filename
     */
    extractFileNameFromUrl(url) {
        try {
            if (!url) return null;

            // Check if it's a Supabase Storage URL
            if (!url.includes('storage/v1/object/public/')) {
                return null;
            }

            // Extract filename from URL
            const parts = url.split(`${this.bucketName}/`);
            return parts[1] || null;
        } catch (error) {
            console.error('URL parsing error:', error);
            return null;
        }
    },

    /**
     * List all images in the bucket
     * @returns {Promise<Array>} - Array of file objects
     */
    async listImages() {
        try {
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .list();

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('List error:', error);
            return [];
        }
    },

    /**
     * Get public URL for a filename
     * @param {string} fileName - Filename in storage
     * @returns {string} - Public URL
     */
    getPublicUrl(fileName) {
        const { data } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        return data.publicUrl;
    },

    /**
     * Compress and resize image before upload
     * @param {File} file - Original image file
     * @param {number} maxWidth - Maximum width in pixels
     * @param {number} maxHeight - Maximum height in pixels
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<Blob>} - Compressed image blob
     */
    async compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            resolve(blob);
                        },
                        'image/jpeg',
                        quality
                    );
                };

                img.onerror = reject;
            };

            reader.onerror = reject;
        });
    },

    /**
     * Upload media with compression (images only, videos uploaded as-is)
     * @param {File} file - Original media file
     * @param {string} productId - Product ID
     * @returns {Promise<string>} - Public URL
     */
    async uploadCompressedImage(file, productId = 'new') {
        try {
            // Check if file is a video
            const isVideo = file.type.startsWith('video/');

            if (isVideo) {
                // Validate video size (max 50MB)
                const maxVideoSize = 50 * 1024 * 1024; // 50MB
                if (file.size > maxVideoSize) {
                    throw new Error(`❌ Video çok büyük! Maksimum boyut: 50MB\nSeçilen dosya: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
                }

                console.log('📹 Video yükleniyor (sıkıştırma yapılmıyor)...');
                // Upload video directly without compression
                return await this.uploadImage(file, productId);
            }

            // For images, compress first
            console.log('🖼️ Resim sıkıştırılıyor...');
            const compressedBlob = await this.compressImage(file);

            // Create new File object from blob
            const compressedFile = new File(
                [compressedBlob],
                file.name,
                { type: 'image/jpeg' }
            );

            // Upload compressed image
            return await this.uploadImage(compressedFile, productId);
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },

    /**
     * Check if storage bucket exists
     * @returns {Promise<boolean>}
     */
    async checkBucketExists() {
        try {
            const { data, error } = await supabase.storage.listBuckets();

            if (error) throw error;

            return data.some(bucket => bucket.name === this.bucketName);
        } catch (error) {
            console.error('Bucket check error:', error);
            return false;
        }
    },

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>}
     */
    async getStorageStats() {
        try {
            const files = await this.listImages();

            let totalSize = 0;
            files.forEach(file => {
                totalSize += file.metadata?.size || 0;
            });

            return {
                fileCount: files.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            console.error('Stats error:', error);
            return { fileCount: 0, totalSize: 0, totalSizeMB: 0 };
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageHelper;
}

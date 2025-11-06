// Supabase Configuration Template
// This file is used by GitHub Actions to generate the actual config
// DO NOT commit the actual supabase-config.js with real credentials

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database helper functions
const db = {

    // Get all comments
    async getComments() {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return data || [];
    },

    // Get single comment
    async getComment(id) {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching comment:', error);
            throw error;
        }
        return data;
    },

    // Add new comment
    async addComment(comment) {
        const { data, error } = await supabase
            .from('comments')
            .insert([comment])
            .select()
            .single();

        if (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
        return data;
    },

    // Update comment
    async updateComment(id, updates) {
        const { data, error } = await supabase
            .from('comments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
        return data;
    },

    // Delete comment
    async deleteComment(id) {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
        return true;
    },

    // Get all products
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }
        return data || [];
    },

    // Get single product
    async getProduct(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
        return data;
    },

    // Add new product
    async addProduct(product) {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();

        if (error) {
            console.error('Error adding product:', error);
            throw error;
        }
        return data;
    },

    // Update product
    async updateProduct(id, updates) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }
        return data;
    },

    // Delete product
    async deleteProduct(id) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
        return true;
    }
};

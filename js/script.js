// Toggle buttons and forms
let searchForm = document.querySelector('.search-form');
let shoppingCart = document.querySelector('.shopping-cart');
let loginForm = document.querySelector('.login-form');
let navbar = document.querySelector('.navbar');

let searchBtn = document.querySelector('#search-btn');
if (searchBtn) {
    searchBtn.onclick = () => {
        if (searchForm) searchForm.classList.toggle('active');
        if (shoppingCart) shoppingCart.classList.remove('active');
        if (loginForm) loginForm.classList.remove('active');
        if (navbar) navbar.classList.remove('active');
    };
}

let cartBtn = document.querySelector('#cart-btn');
if (cartBtn) {
    cartBtn.onclick = () => {
        if (shoppingCart) shoppingCart.classList.toggle('active');
        if (searchForm) searchForm.classList.remove('active');
        if (loginForm) loginForm.classList.remove('active');
        if (navbar) navbar.classList.remove('active');
    };
}

let loginBtn = document.querySelector('#login-btn');
if (loginBtn) {
    loginBtn.onclick = () => {
        if (loginForm) loginForm.classList.toggle('active');
        if (searchForm) searchForm.classList.remove('active');
        if (shoppingCart) shoppingCart.classList.remove('active');
        if (navbar) navbar.classList.remove('active');
    };
}

let menuBtn = document.querySelector('#menue-btn');
if (menuBtn) {
    menuBtn.onclick = () => {
        if (navbar) navbar.classList.toggle('active');
        if (searchForm) searchForm.classList.remove('active');
        if (shoppingCart) shoppingCart.classList.remove('active');
        if (loginForm) loginForm.classList.remove('active');
    };
}

// ----------------------------------------------------
// Supabase Authentication & Session Logic
// ----------------------------------------------------
let currentUser = null;

// Check auth session on page load
async function checkAuthSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        currentUser = session ? session.user : null;
        updateAuthUI();
        await syncCartAndRender();
    } catch (err) {
        console.error("Error checking auth session:", err);
    }
}

// Watch Auth state changes
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
    if (event === 'SIGNED_IN') {
        await mergeLocalCartToSupabase();
    }
    await syncCartAndRender();
});

// Update standard login-form UI
function updateAuthUI() {
    const loginFormContainer = document.querySelector('.login-form');
    if (!loginFormContainer) return;

    if (currentUser) {
        // User logged in: show status and Logout button
        loginFormContainer.innerHTML = `
            <h3>Your Account</h3>
            <p style="font-size: 1.4rem; color: var(--green); font-weight: 600; word-break: break-all; margin: 1rem 0;">Logged in as:<br>${currentUser.email}</p>
            <button id="signout-btn" class="btn" style="width: 100%; display: block; text-align: center; margin: 1rem 0;">Sign Out</button>
        `;
        const signoutBtn = loginFormContainer.querySelector('#signout-btn');
        if (signoutBtn) {
            signoutBtn.onclick = async (e) => {
                e.preventDefault();
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    alert(error.message);
                } else {
                    alert("Signed out successfully!");
                }
            };
        }
    } else {
        // Guest user: render dynamic toggle form
        loginFormContainer.innerHTML = `
            <h3 id="auth-title" style="margin-bottom: 1.5rem;">login now</h3>
            <form id="auth-form-submit">
                <input type="email" id="auth-email" placeholder=" your email" class="box" style="width: 100%; margin: 1rem 0; padding: 1.2rem; font-size: 1.4rem; border-radius: var(--border-radius-sm); border: 1px solid #f0ede8; text-transform: none;" required>
                <input type="password" id="auth-password" placeholder=" your password" class="box" style="width: 100%; margin: 1rem 0; padding: 1.2rem; font-size: 1.4rem; border-radius: var(--border-radius-sm); border: 1px solid #f0ede8; text-transform: none;" required>
                <p id="auth-toggle-msg" style="font-size: 1.3rem; margin: 1rem 0; color: var(--light-color);">don't have an account? <a href="#" id="auth-toggle-btn" style="color: var(--terracotta); text-decoration: underline;">create now</a></p>
                <input type="submit" id="auth-submit-btn" value="login now" class="btn" style="width: 100%; margin-top: 1rem;">
            </form>
        `;
        
        let isSignUpMode = false;
        const authTitle = loginFormContainer.querySelector('#auth-title');
        const authSubmitBtn = loginFormContainer.querySelector('#auth-submit-btn');
        const authToggleMsg = loginFormContainer.querySelector('#auth-toggle-msg');
        const authToggleBtn = loginFormContainer.querySelector('#auth-toggle-btn');
        const authEmail = loginFormContainer.querySelector('#auth-email');
        const authPassword = loginFormContainer.querySelector('#auth-password');

        if (authToggleBtn) {
            authToggleBtn.onclick = (e) => {
                e.preventDefault();
                isSignUpMode = !isSignUpMode;
                if (isSignUpMode) {
                    authTitle.textContent = "register now";
                    authSubmitBtn.value = "register now";
                    authToggleMsg.innerHTML = 'already have an account? <a href="#" id="auth-toggle-btn" style="color: var(--terracotta); text-decoration: underline;">login now</a>';
                } else {
                    authTitle.textContent = "login now";
                    authSubmitBtn.value = "login now";
                    authToggleMsg.innerHTML = 'don\'t have an account? <a href="#" id="auth-toggle-btn" style="color: var(--terracotta); text-decoration: underline;">create now</a>';
                }
                const newToggleBtn = loginFormContainer.querySelector('#auth-toggle-btn');
                if (newToggleBtn) {
                    newToggleBtn.onclick = authToggleBtn.onclick;
                }
            };
        }

        const authForm = loginFormContainer.querySelector('#auth-form-submit');
        if (authForm) {
            authForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = authEmail.value.trim();
                const password = authPassword.value;

                try {
                    if (isSignUpMode) {
                        const { error } = await supabaseClient.auth.signUp({ email, password });
                        if (error) throw error;
                        alert("Registration successful! Please check your email inbox for a verification link.");
                    } else {
                        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                        if (error) throw error;
                        alert("Logged in successfully!");
                        loginFormContainer.classList.remove('active');
                    }
                } catch (err) {
                    console.error("Auth error:", err);
                    alert(err.message || "An authentication error occurred.");
                }
            };
        }
    }
}

// ----------------------------------------------------
// Shopping Cart Operations (Hybrid Local/Database)
// ----------------------------------------------------
function getLocalCart() {
    return JSON.parse(localStorage.getItem('grocery_cart')) || [];
}

function saveLocalCart(cart) {
    localStorage.setItem('grocery_cart', JSON.stringify(cart));
}

// Fetch active items (db if logged in, local storage if guest)
async function getCartItems() {
    if (currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('cart_items')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('id', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching cart from database:", err);
            return [];
        }
    } else {
        return getLocalCart();
    }
}

// Add item to cart
async function addToCart(name, price, img) {
    if (currentUser) {
        try {
            const { data: existing, error: fetchErr } = await supabaseClient
                .from('cart_items')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('product_name', name)
                .maybeSingle();
            
            if (fetchErr) throw fetchErr;

            if (existing) {
                const { error: updateErr } = await supabaseClient
                    .from('cart_items')
                    .update({ quantity: existing.quantity + 1 })
                    .eq('id', existing.id);
                if (updateErr) throw updateErr;
            } else {
                const { error: insertErr } = await supabaseClient
                    .from('cart_items')
                    .insert({
                        user_id: currentUser.id,
                        product_name: name,
                        price: parseFloat(price),
                        image_url: img,
                        quantity: 1
                    });
                if (insertErr) throw insertErr;
            }
            alert(`${name} added to database cart!`);
            await syncCartAndRender();
        } catch (err) {
            console.error("Error adding to database cart:", err);
            alert("Failed to add to database cart.");
        }
    } else {
        let cart = getLocalCart();
        let existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price: parseFloat(price), img, quantity: 1 });
        }
        saveLocalCart(cart);
        alert(`${name} added to cart!`);
        await syncCartAndRender();
    }
}

// Remove item from cart
async function removeFromCart(name) {
    if (currentUser) {
        try {
            const { error } = await supabaseClient
                .from('cart_items')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('product_name', name);
            if (error) throw error;
            await syncCartAndRender();
        } catch (err) {
            console.error("Error removing from database cart:", err);
        }
    } else {
        let cart = getLocalCart();
        cart = cart.filter(item => item.name !== name);
        saveLocalCart(cart);
        await syncCartAndRender();
    }
}

// Merge localStorage cart items into database cart on login
async function mergeLocalCartToSupabase() {
    if (!currentUser) return;
    const localCart = getLocalCart();
    if (localCart.length === 0) return;

    console.log("Merging local storage cart into Supabase database...");
    try {
        for (const item of localCart) {
            const { data: existing, error: fetchErr } = await supabaseClient
                .from('cart_items')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('product_name', item.name)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            if (existing) {
                await supabaseClient
                    .from('cart_items')
                    .update({ quantity: existing.quantity + item.quantity })
                    .eq('id', existing.id);
            } else {
                await supabaseClient
                    .from('cart_items')
                    .insert({
                        user_id: currentUser.id,
                        product_name: item.name,
                        price: parseFloat(item.price),
                        image_url: item.img,
                        quantity: item.quantity
                    });
            }
        }
        localStorage.removeItem('grocery_cart');
        console.log("Merge completed successfully.");
    } catch (err) {
        console.error("Error during cart merge:", err);
    }
}

// Render dynamic cart overlay
async function syncCartAndRender() {
    let cartContainers = document.querySelectorAll('.shopping-cart');
    const items = await getCartItems();

    cartContainers.forEach(container => {
        if (items.length === 0) {
            container.innerHTML = '<div style="font-size: 1.6rem; padding: 2rem 0; text-align: center; color: var(--light-color);">Your cart is empty</div>';
            return;
        }

        let html = '';
        let total = 0;

        items.forEach(item => {
            const name = item.product_name || item.name;
            const price = item.price;
            const quantity = item.quantity;
            let imgSrc = item.image_url || item.img;
            if (imgSrc.startsWith('/')) {
                imgSrc = imgSrc.substring(1);
            }

            let itemTotal = price * quantity;
            total += itemTotal;
            
            html += `
            <div class="box" style="display: flex; align-items: center; gap: 1rem; position: relative; margin: 1rem 0; border: 0.5px solid #eee;">
                <i class="fa fa-trash delete-item-btn" data-name="${name}" style="font-size: 2rem; position: absolute; top: 50%; right: 2rem; cursor: pointer; color: var(--light-color); transform: translateY(-50%);"></i>
                <img src="${imgSrc}" style="height: 8rem; width: 8rem; object-fit: contain;">
                <div class="content">
                    <h3 style="color: var(--black); font-size: 1.5rem; padding-bottom: .5rem;">${name}</h3>
                    <span class="price" style="color: var(--green); font-size: 1.4rem;">Rs. ${price}/-</span>
                    <span class="quantity" style="color: var(--light-color); font-size: 1.3rem; padding-left: 1rem;">Qty : ${quantity}</span>
                </div>
            </div>`;
        });

        html += `
        <div class="total" style="font-size: 2rem; padding: 1rem 0; text-align: center; color: var(--black);">total : Rs. ${total}/-</div>
        <a href="#" class="btn checkout-btn" style="display: block; text-align: center; margin: 1rem 0;">checkout</a>`;

        container.innerHTML = html;

        // Delete handlers
        container.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const name = btn.getAttribute('data-name');
                await removeFromCart(name);
            };
        });

        // Checkout handlers
        const checkoutBtn = container.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.onclick = async (e) => {
                e.preventDefault();
                await handleCheckout(items, total);
            };
        }
    });
}

// Checkout action (logging to database if logged in)
async function handleCheckout(items, total) {
    if (currentUser) {
        try {
            // Log to orders table
            const { data: order, error: orderErr } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: currentUser.id,
                    total_price: parseFloat(total)
                })
                .select()
                .single();

            if (orderErr) throw orderErr;

            // Log to order_items table
            const orderItemsInsert = items.map(item => ({
                order_id: order.id,
                product_name: item.product_name || item.name,
                price: parseFloat(item.price),
                quantity: item.quantity
            }));

            const { error: itemsErr } = await supabaseClient
                .from('order_items')
                .insert(orderItemsInsert);

            if (itemsErr) throw itemsErr;

            // Delete cart items
            const { error: clearErr } = await supabaseClient
                .from('cart_items')
                .delete()
                .eq('user_id', currentUser.id);

            if (clearErr) throw clearErr;

            alert('Thank you for your purchase! Checkout completed successfully and logged in database.');
            await syncCartAndRender();
        } catch (err) {
            console.error("Checkout process error:", err);
            alert("Database checkout failed.");
        }
    } else {
        alert('Thank you for your purchase! Checkout completed successfully.');
        localStorage.removeItem('grocery_cart');
        await syncCartAndRender();
    }
}

// ----------------------------------------------------
// Dynamic Product Catalog Rendering
// ----------------------------------------------------
async function fetchAndRenderProducts() {
    const swiperWrapper = document.querySelector('.products .product-slider .swiper-wrapper');
    if (!swiperWrapper) return; // Not a product page

    // Parse path to fetch correct category
    const cleanPath = window.location.pathname.split("/").pop();
    const page = cleanPath.split("?")[0] || "index.html";
    const category = (page === "index.html" || page === "") ? "top_buys" : page.replace(".html", "");

    swiperWrapper.innerHTML = '<div style="font-size: 1.8rem; text-align: center; width: 100%; grid-column: 1/-1; padding: 2rem; color: var(--light-color);">Loading products...</div>';

    try {
        const response = await supabaseClient
            .from('products')
            .select('*')
            .eq('category', category);

        console.log("Supabase Fetch Debug:", {
            categoryRequested: category,
            rawResponse: response
        });

        const { data: productsList, error } = response;
        if (error) throw error;

        if (!productsList || productsList.length === 0) {
            swiperWrapper.innerHTML = '<div style="font-size: 1.8rem; text-align: center; width: 100%; grid-column: 1/-1; padding: 2rem; color: var(--light-color);">No products found in this category.</div>';
            return;
        }

        let html = '';
        productsList.forEach(prod => {
            html += `
            <div class="swiper-slide box">
                <img src="${prod.image_url}" alt="${prod.name}">
                <h1>${prod.name}</h1>
                <div class="price"> Rs ${Math.round(prod.price)}/-</div>
                <a href="#" class="btn add-to-cart" data-name="${prod.name}" data-price="${prod.price}">add to cart</a>
            </div>`;
        });

        swiperWrapper.innerHTML = html;

        // Dynamic Add to Cart bindings
        swiperWrapper.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const name = btn.getAttribute('data-name');
                const price = btn.getAttribute('data-price');
                const imgEl = btn.closest('.box').querySelector('img');
                const img = imgEl ? imgEl.getAttribute('src') : '';
                await addToCart(name, price, img);
            };
        });

        // Setup slider
        initializeSwiper();

    } catch (err) {
        console.error("Error loading products from database:", err);
        swiperWrapper.innerHTML = `<div style="font-size: 1.8rem; text-align: center; width: 100%; grid-column: 1/-1; padding: 2rem; color: var(--terracotta);">Could not connect to database.</div>`;
    }
}

// Swiper instantiator
function initializeSwiper() {
    new Swiper(".product-slider", {
        loop: true,
        spaceBetween: 20,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        breakpoints: {
          640: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 2,
          },
          1020: {
            slidesPerView: 3,
          },
        },
    });
}

// ----------------------------------------------------
// Page Initializers
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
    fetchAndRenderProducts();
});

// ----------------------------------------------------
// Live Product Search (Debounced & Supabase Driven)
// ----------------------------------------------------
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
}

async function handleSearch(searchTerm) {
    let resultsContainer = document.querySelector('.search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        if (searchForm) searchForm.appendChild(resultsContainer);
    }

    if (!searchTerm || searchTerm.trim() === '') {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div style="font-size: 1.4rem; padding: 1.5rem; text-align: center; color: var(--light-color);">Searching...</div>';

    try {
        const { data: productsList, error } = await supabaseClient
            .from('products')
            .select('*')
            .ilike('name', `%${searchTerm}%`);

        if (error) throw error;

        if (!productsList || productsList.length === 0) {
            resultsContainer.innerHTML = '<div style="font-size: 1.4rem; padding: 1.5rem; text-align: center; color: var(--light-color);">No products found.</div>';
            return;
        }

        let html = '';
        productsList.forEach(prod => {
            let imgSrc = prod.image_url;
            if (imgSrc.startsWith('/')) {
                imgSrc = imgSrc.substring(1);
            }
            html += `
            <div class="search-result-item" style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.5rem; border-bottom: 1px solid #f0ede8; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${imgSrc}" style="height: 4.5rem; width: 4.5rem; object-fit: contain;">
                    <div style="text-align: left;">
                        <h4 style="font-size: 1.3rem; color: var(--black); font-weight: 600; text-transform: capitalize;">${prod.name}</h4>
                        <span style="font-size: 1.2rem; color: var(--green); font-weight: 600;">Rs. ${Math.round(prod.price)}/-</span>
                    </div>
                </div>
                <button class="btn search-add-btn" data-name="${prod.name}" data-price="${prod.price}" data-img="${imgSrc}" style="padding: 0.5rem 1.2rem; font-size: 1.2rem; margin-top: 0; border-radius: var(--border-radius-sm);">Add</button>
            </div>`;
        });

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';

        // Bind event listeners to Add to Cart buttons in search results
        resultsContainer.querySelectorAll('.search-add-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const name = btn.getAttribute('data-name');
                const price = btn.getAttribute('data-price');
                const img = btn.getAttribute('data-img');
                await addToCart(name, price, img);
            };
        });

    } catch (err) {
        console.error("Search error:", err);
        resultsContainer.innerHTML = '<div style="font-size: 1.4rem; padding: 1.5rem; text-align: center; color: var(--terracotta);">Error loading results.</div>';
    }
}

const searchBox = document.querySelector('#search-box');
if (searchBox) {
    searchBox.addEventListener('input', debounce((e) => {
        handleSearch(e.target.value.trim());
    }, 300));
}

// H & S Home Solutions — shortlisted catalogue
// Prices are suggested starting prices and must be confirmed against supplier stock and current market listings.
const WHATSAPP_NUMBER = '923162669126';
const products = [
 {id:1,name:"Vegetable Cutter & Slicer",price:549,category:"Kitchen Tools",emoji:"🥕",description:"Chop and slice vegetables for everyday meal prep."},
 {id:2,name:"Portable Oil Spray Bottle",price:279,category:"Kitchen Tools",emoji:"🫒",description:"Spray or pour cooking oil with a handy kitchen bottle."},
 {id:3,name:"Mini Manual Chopper",price:449,category:"Kitchen Tools",emoji:"🥬",description:"A compact manual helper for chopping small ingredients."},
 {id:4,name:"Stainless Steel Sponge Holder",price:449,category:"Storage",emoji:"🧽",description:"Keep a dish sponge neatly stored near the sink."},
 {id:5,name:"4-in-1 Multi Grater",price:899,category:"Kitchen Tools",emoji:"🧀",description:"A multi-use grater for common kitchen prep tasks."},
 {id:6,name:"Zipper Roti Cover",price:179,category:"Storage",emoji:"🫓",description:"Help keep rotis covered between serving and mealtime."},
 {id:7,name:"Egg Beater",price:229,category:"Kitchen Tools",emoji:"🥚",description:"A simple tool for beating eggs and mixing ingredients."},
 {id:8,name:"Sauce Dipping Plate",price:179,category:"Dining",emoji:"🍽️",description:"A small serving plate for sauces and dips."},
 {id:9,name:"Silicone Sealing Tape",price:449,category:"Home Accessories",emoji:"🧰",description:"A sealing tape option for suitable household gaps and edges."},
 {id:10,name:"2-in-1 Foaming Soap Dish",price:349,category:"Storage",emoji:"🧼",description:"A compact soap and sink-area accessory."},
 {id:11,name:"Flexible Microfibre Duster",price:499,category:"Cleaning",emoji:"🪶",description:"Reach dust on shelves and other household surfaces."},
 {id:12,name:"360° Refrigerator Organizer",price:2199,category:"Storage",emoji:"🧊",description:"Help organize refrigerator items for easier access."},
];
let cart=[]; let activeCategory='';
const money=n=>'Rs. '+Number(n).toLocaleString('en-PK');
const productRoot=document.getElementById('products');
function renderProducts(){const q=(document.getElementById('searchInput').value||'').toLowerCase();const list=products.filter(p=>(!activeCategory||p.category===activeCategory)&&(`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)));productRoot.innerHTML=list.length?list.map(p=>`<article class="product"><div class="productvisual" aria-label="Illustrative product icon">${p.emoji}</div><div class="productbody"><h3>${p.name}</h3><small>${p.description}</small><div class="price">${money(p.price)}</div><button class="btn" onclick="addToCart(${p.id})">Add to cart</button></div></article>`).join(''):'<p>No products found. Try another search.</p>';}
window.addToCart=id=>{const p=products.find(x=>x.id===id);const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({...p,qty:1});renderCart();};
function renderCart(){document.getElementById('cartCount').textContent=cart.reduce((s,p)=>s+p.qty,0);const root=document.getElementById('cartItems');if(!cart.length){root.innerHTML='<p class="empty">Your cart is empty. Add a product to get started.</p>';return;}root.innerHTML=cart.map(p=>`<div class="cartline"><div><strong>${p.name}</strong><br><small>${money(p.price)} each</small></div><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button>${p.qty}<button onclick="changeQty(${p.id},1)">+</button></div><strong>${money(p.price*p.qty)}</strong></div>`).join('')+`<p><strong>Total: ${money(cart.reduce((s,p)=>s+p.price*p.qty,0))}</strong></p>`;}
window.changeQty=(id,d)=>{const p=cart.find(x=>x.id===id);if(p)p.qty+=d;cart=cart.filter(p=>p.qty>0);renderCart();};
function openWhatsApp(message){window.open('https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(message),'_blank','noopener');}
document.getElementById('whatsAppHelp').addEventListener('click',()=>openWhatsApp('Assalam-o-Alaikum H & S Home Solutions! I have a question about your products.'));
document.getElementById('openCart').addEventListener('click',()=>{document.getElementById('cartOverlay').style.display='flex';renderCart();});
document.getElementById('closeCart').addEventListener('click',()=>document.getElementById('cartOverlay').style.display='none');
document.getElementById('cartOverlay').addEventListener('click',e=>{if(e.target.id==='cartOverlay')e.currentTarget.style.display='none';});
document.getElementById('checkout').addEventListener('click',()=>{if(!cart.length){alert('Please add a product to your cart first.');return;}const name=document.getElementById('customerName').value.trim(),phone=document.getElementById('customerPhone').value.trim(),address=document.getElementById('customerAddress').value.trim(),payment=document.getElementById('paymentMethod').value;if(!name||!phone||!address){alert('Please enter your name, phone number and delivery address.');return;}const lines=cart.map(p=>`- ${p.name} x ${p.qty} = ${money(p.price*p.qty)}`).join('\n');const total=cart.reduce((s,p)=>s+p.price*p.qty,0);const msg=`Assalam-o-Alaikum H & S Home Solutions, I want to place an order:\n\n${lines}\n\nEstimated product total: ${money(total)}\nPayment: ${payment}\n\nCustomer: ${name}\nPhone: ${phone}\nAddress: ${address}\n\nPlease confirm stock, final price and delivery charges before accepting this order.`;openWhatsApp(msg);});
document.getElementById('searchForm').addEventListener('submit',e=>{e.preventDefault();renderProducts();document.getElementById('shop').scrollIntoView({behavior:'smooth'});});
document.getElementById('clearFilter').addEventListener('click',()=>{activeCategory='';document.getElementById('searchInput').value='';renderProducts();});document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.category;renderProducts();document.getElementById('shop').scrollIntoView({behavior:'smooth'});}));document.getElementById('year').textContent=new Date().getFullYear();renderProducts();renderCart();

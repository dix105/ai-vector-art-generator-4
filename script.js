document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // GLOBAL STATE & CONFIGURATION
    // ==========================================
    let currentUploadedUrl = null;
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    
    // ==========================================
    // 1. Mobile Menu Toggle (EXISTING)
    // ==========================================
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            
            // Animate hamburger to X
            const spans = mobileBtn.querySelectorAll('span');
            if (mobileMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // ==========================================
    // 2. FAQ Accordion (EXISTING)
    // ==========================================
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            // Toggle current
            item.classList.toggle('active');
        });
    });

    // ==========================================
    // 3. Modal Logic (EXISTING)
    // ==========================================
    const modalLinks = document.querySelectorAll('[data-modal]');
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.modal-close');

    modalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.getAttribute('data-modal') + '-modal';
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'block';
        });
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // ==========================================
    // 4. API & GENERATION LOGIC (INJECTED)
    // ==========================================
    
    // DOM Elements
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const previewPlaceholder = document.getElementById('preview-placeholder'); // Or .placeholder-text
    const generateBtn = document.getElementById('generate-btn');
    const loadingOverlay = document.getElementById('loading-overlay'); // Acts as #loading-state
    const resultContainer = document.getElementById('result-container');
    const resultImage = document.getElementById('result-image'); // Acts as #result-final
    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Fix for CONTENT_MISMATCH: Update button label if it says "SVG" but code supports dynamic types
    if (downloadBtn && downloadBtn.textContent.includes('SVG')) {
        downloadBtn.textContent = 'Download Image';
    }

    // --- Helper Functions ---

    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // UI State Helpers
    function showLoading() {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultContainer) resultContainer.classList.add('loading');
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (resultContainer) resultContainer.classList.remove('loading');
    }

    function updateStatus(text) {
        // Fix: Removed JS_ID_MISMATCH reference to 'status-text' as it does not exist in HTML.
        // We rely on the button text update below for status feedback.
        
        // Update Generate button state
        if (generateBtn) {
            if (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING')) {
                generateBtn.disabled = true;
                generateBtn.textContent = text;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Vector Art';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Again';
            }
        }
    }

    function showError(msg) {
        console.error(msg);
        alert('Error: ' + msg);
    }

    function showPreview(url) {
        if (previewImage) {
            previewImage.src = url;
            previewImage.style.display = 'block';
        }
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'none';
    }

    // --- API Functions ---

    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        // Filename is just nanoid.extension
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        console.log('Got signed URL');
        
        // Step 2: PUT file
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        console.log('Uploaded to:', downloadUrl);
        return downloadUrl;
    }

    async function submitImageGenJob(imageUrl) {
        // Config: image-effects / photoToVectorArt
        const endpoint = 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        };

        const body = {
            model: 'image-effects',
            toolType: 'image-effects',
            effectId: 'photoToVectorArt',
            imageUrl: imageUrl,
            userId: USER_ID,
            removeWatermark: true,
            isPrivate: true
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Job submitted:', data.jobId, 'Status:', data.status);
        return data;
    }

    async function pollJobStatus(jobId) {
        const baseUrl = 'https://api.chromastudio.ai/image-gen';
        const POLL_INTERVAL = 2000;
        const MAX_POLLS = 60;
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: { 'Accept': 'application/json, text/plain, */*' }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Poll', polls + 1, '- Status:', data.status);
            
            if (data.status === 'completed') {
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out');
    }

    // --- Main Handlers ---

    async function handleFileSelect(file) {
        if (!file) return;
        
        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            return;
        }

        try {
            showLoading();
            updateStatus('UPLOADING...');
            
            // Upload immediately
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Show preview
            showPreview(uploadedUrl);
            
            updateStatus('READY');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    async function handleGenerate() {
        if (!currentUploadedUrl) return;
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // 1. Submit
            const jobData = await submitImageGenJob(currentUploadedUrl);
            
            updateStatus('JOB QUEUED...');
            
            // 2. Poll
            const result = await pollJobStatus(jobData.jobId);
            
            // 3. Extract Result URL
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No image URL in response');
            }
            
            console.log('Result:', resultUrl);
            
            // 4. Display Result
            if (resultImage) {
                resultImage.src = resultUrl;
                resultImage.style.display = 'block';
            }
            
            if (resultContainer) {
                resultContainer.style.display = 'block';
            }
            
            // Hide preview to focus on result
            if (previewImage) previewImage.style.display = 'none';

            // Store URL for download
            if (downloadBtn) {
                downloadBtn.dataset.url = resultUrl;
                downloadBtn.style.display = 'inline-block';
            }
            
            updateStatus('COMPLETE');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // --- Event Listeners Wiring ---

    // 1. Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    });

    // 2. Click to Upload
    dropZone.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            handleFileSelect(file);
        });
    }

    // 3. Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // 4. Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            if (previewImage) {
                previewImage.src = '';
                previewImage.style.display = 'none';
            }
            if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
            if (resultContainer) resultContainer.style.display = 'none';
            if (fileInput) fileInput.value = '';
            
            // Reset button state
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generate Vector Art';
            }
        });
    }

    // 5. Download Button (Robust)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            function getExtensionFromType(type) {
                if (type === 'image/svg+xml') return 'svg';
                if (type === 'image/png') return 'png';
                return 'jpg';
            }

            function downloadBlob(blob, filename) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }

            try {
                // Strategy 1: Proxy
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                const blob = await response.blob();
                
                // Fix: Dynamic extension based on actual content type
                const ext = getExtensionFromType(blob.type);
                downloadBlob(blob, 'vector_art_' + generateNanoId(8) + '.' + ext);
            } catch (err) {
                console.warn('Proxy failed, trying direct:', err);
                // Strategy 2: Direct
                try {
                    const directResp = await fetch(url + '?t=' + Date.now(), { mode: 'cors' });
                    if (!directResp.ok) throw new Error('Direct failed');
                    const blob = await directResp.blob();
                    
                    // Fix: Dynamic extension based on actual content type
                    const ext = getExtensionFromType(blob.type);
                    downloadBlob(blob, 'vector_art_' + generateNanoId(8) + '.' + ext);
                } catch (finalErr) {
                    alert('Download failed. Please right-click the image and select "Save Image As".');
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});
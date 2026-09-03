/**
 * RailConnect AI / RailRakshak SIH Railway Platform Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
        });
    }

    // 2. SOS Emergency Modal Handling & Geolocation
    const sosTriggerBtns = document.querySelectorAll('.sos-trigger-btn');
    const sosModal = document.getElementById('sosModalOverlay');
    const closeSosModal = document.getElementById('closeSosModal');
    const latInput = document.getElementById('id_latitude');
    const lngInput = document.getElementById('id_longitude');

    function openSos() {
        if (sosModal) {
            sosModal.classList.add('active');
            // Fetch live coordinates
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    if (latInput) latInput.value = pos.coords.latitude;
                    if (lngInput) lngInput.value = pos.coords.longitude;
                }, (err) => {
                    console.log('Location access skipped or unavailable:', err.message);
                });
            }
        }
    }

    sosTriggerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openSos();
        });
    });

    if (closeSosModal && sosModal) {
        closeSosModal.addEventListener('click', () => {
            sosModal.classList.remove('active');
        });
        sosModal.addEventListener('click', (e) => {
            if (e.target === sosModal) {
                sosModal.classList.remove('active');
            }
        });
    }

    // 3. AI Real-Time Grievance Priority Estimator
    const grievanceDesc = document.getElementById('grievance_description');
    const grievanceCategory = document.getElementById('grievance_category');
    const aiFeedbackBox = document.getElementById('aiFeedbackPreview');

    let debounceTimer;
    function fetchAiPrediction() {
        if (!grievanceDesc || !aiFeedbackBox) return;
        const text = grievanceDesc.value.trim();
        const category = grievanceCategory ? grievanceCategory.value : '';

        if (text.length < 5) {
            aiFeedbackBox.style.display = 'none';
            return;
        }

        fetch(`/grievances/api/ai-preview/?text=${encodeURIComponent(text)}&category=${encodeURIComponent(category)}`)
            .then(res => res.json())
            .then(data => {
                aiFeedbackBox.style.display = 'block';
                const prioBadge = document.getElementById('aiPriorityBadge');
                const sentimentText = document.getElementById('aiSentimentText');
                const slaText = document.getElementById('aiSlaText');
                const keywordsBadge = document.getElementById('aiKeywordsBadge');

                if (prioBadge) {
                    prioBadge.textContent = data.priority;
                    prioBadge.className = 'badge ' + (
                        data.priority === 'CRITICAL' ? 'badge-critical' :
                        data.priority === 'HIGH' ? 'badge-high' :
                        data.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                    );
                }
                if (sentimentText) sentimentText.textContent = `Sentiment: ${data.sentiment}`;
                if (slaText) slaText.textContent = `Target SLA: ~${data.recommended_sla_hours} hrs`;
                if (keywordsBadge && data.detected_keywords.length > 0) {
                    keywordsBadge.textContent = `Triggers: ${data.detected_keywords.join(', ')}`;
                } else if (keywordsBadge) {
                    keywordsBadge.textContent = '';
                }
            })
            .catch(err => console.error('AI preview error:', err));
    }

    if (grievanceDesc) {
        grievanceDesc.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchAiPrediction, 400);
        });
    }
    if (grievanceCategory) {
        grievanceCategory.addEventListener('change', fetchAiPrediction);
    }

    // 4. Auto-dismiss alerts after 6 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 500);
        }, 6000);
    });
});

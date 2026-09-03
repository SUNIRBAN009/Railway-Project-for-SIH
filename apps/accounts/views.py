from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import UserProfile, UserRole
from .forms import RegistrationForm, UserProfileUpdateForm

def register_view(request):
    if request.user.is_authenticated:
        return redirect('core:dashboard')
    
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.save()

            role = form.cleaned_data.get('role', UserRole.PASSENGER)
            phone_number = form.cleaned_data.get('phone_number', '')

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.phone_number = phone_number
            profile.save()

            login(request, user)
            messages.success(request, f"Welcome to RailConnect, {user.username}! Your account has been created.")
            return redirect('core:dashboard')
    else:
        form = RegistrationForm()
    
    return render(request, 'accounts/register.html', {'form': form})

def login_view(request):
    if request.user.is_authenticated:
        return redirect('core:dashboard')
    
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Welcome back, {user.username} ({getattr(user.profile, 'get_role_display', lambda: 'User')()})!")
            next_url = request.GET.get('next', 'core:dashboard')
            return redirect(next_url)
        else:
            messages.error(request, "Invalid username or password. Please try again.")
    else:
        form = AuthenticationForm()
    
    return render(request, 'accounts/login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out successfully.")
    return redirect('core:home')

@login_required
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = UserProfileUpdateForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            request.user.first_name = form.cleaned_data.get('first_name', '')
            request.user.last_name = form.cleaned_data.get('last_name', '')
            request.user.email = form.cleaned_data.get('email', '')
            request.user.save()
            form.save()
            messages.success(request, "Your profile has been updated.")
            return redirect('accounts:profile')
    else:
        initial = {
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'email': request.user.email,
        }
        form = UserProfileUpdateForm(instance=profile, initial=initial)
    
    return render(request, 'accounts/profile.html', {'form': form, 'profile': profile})

def demo_login_switch(request, role_name):
    """
    Instant role switcher for Hackathon demos.
    Allows testing Passenger, Station Master, RPF, Maintenance, and Admin workflows with 1 click.
    """
    role_map = {
        'passenger': ('demo_passenger', UserRole.PASSENGER, 'Demo Passenger'),
        'station_master': ('demo_station_master', UserRole.STATION_MASTER, 'Demo Station Master'),
        'rpf': ('demo_rpf', UserRole.RPF_OFFICER, 'Demo RPF Officer'),
        'maintenance': ('demo_maintenance', UserRole.MAINTENANCE_TECH, 'Demo Maintenance Engineer'),
        'admin': ('demo_admin', UserRole.ADMIN, 'Demo Administrator'),
    }

    if role_name not in role_map:
        messages.error(request, "Unknown demo role selected.")
        return redirect('core:home')
    
    username, role, display_title = role_map[role_name]
    
    user, created = User.objects.get_or_create(username=username, defaults={
        'email': f"{username}@railconnect.in",
        'first_name': display_title.split()[1] if len(display_title.split()) > 1 else 'Demo',
        'last_name': 'Official' if 'Official' in display_title or 'Master' in display_title else 'User',
        'is_staff': (role == UserRole.ADMIN),
        'is_superuser': (role == UserRole.ADMIN),
    })

    if created:
        user.set_password('demo@1234')
        user.save()
    
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    if role == UserRole.STATION_MASTER:
        profile.assigned_station = "NDLS - New Delhi"
        profile.badge_number = "SM-NDLS-402"
    elif role == UserRole.RPF_OFFICER:
        profile.assigned_station = "HWH - Howrah Jn"
        profile.badge_number = "RPF-KOL-883"
    elif role == UserRole.MAINTENANCE_TECH:
        profile.assigned_station = "CSMT - Mumbai Central"
        profile.badge_number = "TECH-WR-109"
    elif role == UserRole.ADMIN:
        profile.badge_number = "HQ-RAILWAY-001"
    profile.save()

    login(request, user)
    messages.success(request, f"⚡ Switched into demo role: {display_title}")
    return redirect(request.GET.get('next', 'core:dashboard'))

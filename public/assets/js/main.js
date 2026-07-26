(function () {
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const servicesToggle = document.querySelector(".drop-toggle");
  const servicesDropdown = servicesToggle
    ? servicesToggle.nextElementSibling
    : null;

  const mobileScreen = window.matchMedia("(max-width: 840px)");

  function closeServicesMenu() {
    if (!servicesToggle || !servicesDropdown) {
      return;
    }

    servicesDropdown.classList.remove("open");
    servicesToggle.setAttribute("aria-expanded", "false");
  }

  function closeMobileMenu() {
    if (!mobileToggle || !navMenu) {
      return;
    }

    navMenu.classList.remove("open");
    mobileToggle.setAttribute("aria-expanded", "false");

    closeServicesMenu();
  }

  /*
   * Open and close the main mobile navigation.
   */
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", function () {
      const menuIsOpen = navMenu.classList.toggle("open");

      mobileToggle.setAttribute(
        "aria-expanded",
        String(menuIsOpen)
      );

      if (!menuIsOpen) {
        closeServicesMenu();
      }
    });
  }

  /*
   * Open and close the Services submenu on mobile.
   * Desktop hover behavior remains unchanged.
   */
  if (servicesToggle && servicesDropdown) {
    servicesToggle.setAttribute("aria-expanded", "false");

    servicesToggle.addEventListener("click", function (event) {
      if (!mobileScreen.matches) {
        return;
      }

      event.preventDefault();

      const submenuIsOpen =
        servicesDropdown.classList.toggle("open");

      servicesToggle.setAttribute(
        "aria-expanded",
        String(submenuIsOpen)
      );
    });
  }

  /*
   * Close the mobile navigation after selecting a page.
   */
  if (navMenu) {
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (mobileScreen.matches) {
          closeMobileMenu();
        }
      });
    });
  }

  /*
   * Close the menu when clicking outside the navigation.
   */
  document.addEventListener("click", function (event) {
    const topbar = document.querySelector(".topbar");

    if (
      mobileScreen.matches &&
      topbar &&
      !topbar.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  /*
   * Allow the Escape key to close the menu.
   */
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  /*
   * Clear mobile-only menu states when returning to desktop size.
   */
  mobileScreen.addEventListener("change", function (event) {
    if (!event.matches) {
      closeMobileMenu();
    }
  });
})();

/*
 * Provide feedback while website forms are being submitted
 * and prevent accidental duplicate submissions.
 */
(function () {
  const websiteForms = document.querySelectorAll(
    'form[action="/api/quote"]'
  );

  function restoreForm(form) {
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (!submitButton) {
      return;
    }

    if (submitButton.dataset.originalText) {
      submitButton.textContent =
        submitButton.dataset.originalText;
    }

    submitButton.disabled = false;

    form.classList.remove("is-submitting");
    form.removeAttribute("aria-busy");
  }

  websiteForms.forEach(function (form) {
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (!submitButton) {
      return;
    }

    submitButton.dataset.originalText =
      submitButton.textContent.trim();

    form.addEventListener("submit", function () {
      /*
       * The browser runs required-field and email validation
       * before this submit event occurs.
       */
      form.classList.add("is-submitting");
      form.setAttribute("aria-busy", "true");

      submitButton.disabled = true;
      submitButton.textContent = "Sending…";
    });
  });

  /*
   * Browsers may preserve the page when the visitor presses Back.
   * Restore the form so the Submit button is usable again.
   */
  window.addEventListener("pageshow", function () {
    websiteForms.forEach(function (form) {
      restoreForm(form);
    });
  });
})();
/*
 * Preselect a service on the quote form when the visitor
 * arrives from a service-specific page.
 */
(function () {
  const serviceSelect = document.querySelector(
    'select[name="service"]'
  );

  if (!serviceSelect) {
    return;
  }

  const parameters = new URLSearchParams(
    window.location.search
  );

  const requestedService = parameters.get("service");

  if (!requestedService) {
    return;
  }

  const matchingOption = Array.from(
    serviceSelect.options
  ).find(function (option) {
    return option.value === requestedService;
  });

  if (matchingOption) {
    serviceSelect.value = requestedService;
  }
})();
import { expect, test, type Page } from "@playwright/test";

async function openProjects(page: Page, mobile: boolean) {
  if (mobile) {
    await page
      .getByRole("button", { name: "Projects", pressed: false })
      .click();
  }
}

async function openCalendar(page: Page, mobile: boolean) {
  if (mobile) {
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { exact: true, name: "Calendar" })
      .click();
  } else {
    await page
      .getByRole("group", { name: "Primary view" })
      .getByRole("button", { name: "Calendar" })
      .click();
  }
  await expect(page.getByRole("main", { name: "Calendar" })).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("button", { name: `Open ${name}` }),
  ).toBeVisible();
}

test("creates and persists a multi-project daily Markdown note", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const thesis = `Thesis calendar ${testInfo.project.name}`;
  const visa = `Visa calendar ${testInfo.project.name}`;
  const milestone = `Draft checkpoint ${testInfo.project.name}`;
  await page.goto("/#token=e2e-token");

  await openProjects(page, mobile);
  await createProject(page, thesis);
  await createProject(page, visa);
  await openCalendar(page, mobile);

  const dateCell = page
    .getByRole("gridcell")
    .filter({ has: page.getByRole("button", { name: "Open 2026-06-16" }) });
  await dateCell.hover();
  await page
    .getByRole("button", { name: "Add milestone on 2026-06-16" })
    .click();
  const dialog = page.getByRole("dialog", { name: "New milestone" });
  await dialog.getByLabel("Short title").fill(milestone);
  await dialog
    .getByRole("combobox", { exact: true, name: "Project" })
    .selectOption({ label: thesis });
  await dialog.getByRole("button", { name: "Create milestone" }).click();

  await dateCell.getByRole("button", { name: "Open 2026-06-16" }).click();
  await expect(
    page.getByRole("heading", { name: "June 16, 2026" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Details" })
      .getByText(milestone),
  ).toBeVisible();

  const details = page.getByRole("complementary", { name: "Details" });
  const thesisCheckbox = details.getByRole("checkbox", {
    exact: true,
    name: thesis,
  });
  const visaCheckbox = details.getByRole("checkbox", {
    exact: true,
    name: visa,
  });
  await thesisCheckbox.click();
  await expect(thesisCheckbox).toBeChecked();
  await visaCheckbox.click();
  await expect(visaCheckbox).toBeChecked();

  const markdown = "# Work log\n\n- Reviewed outline\n- Sent advisor notes";
  await page.getByRole("textbox", { name: "Daily Markdown" }).fill(markdown);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Work log" }),
  ).toBeVisible();
  await expect(page.getByText("Reviewed outline")).toBeVisible();

  await page.reload();
  await openCalendar(page, mobile);
  await page.getByRole("button", { name: "Open 2026-06-16" }).click();
  await expect(thesisCheckbox).toBeChecked();
  await expect(visaCheckbox).toBeChecked();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Work log" }),
  ).toBeVisible();
  await expect(page.getByText("Sent advisor notes")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`daily-details-${testInfo.project.name}.png`),
  });

  if (mobile) {
    await openCalendar(page, true);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath("calendar-mobile.png"),
    });
  }
});

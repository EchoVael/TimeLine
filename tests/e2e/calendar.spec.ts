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

test("switches calendar month and year directly", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await page.goto("/#token=e2e-token");
  await openCalendar(page, mobile);

  const year = page.getByRole("combobox", { name: "Year" });
  const month = page.getByRole("combobox", { name: "Month" });

  await month.selectOption("12");
  await year.selectOption("2027");
  await expect(page.getByRole("grid", { name: "December 2027" })).toBeVisible();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(year).toHaveValue("2028");
  await expect(month).toHaveValue("1");

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(year).toHaveValue("2027");
  await expect(month).toHaveValue("12");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`calendar-period-${testInfo.project.name}.png`),
  });
});

test("expands daily Markdown with live and preview-only modes", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const date = mobile ? "2026-06-19" : "2026-06-18";
  await page.clock.setFixedTime(new Date("2026-06-16T12:00:00+08:00"));
  await page.goto("/#token=e2e-token");
  await openCalendar(page, mobile);
  await page.getByRole("button", { name: `Open ${date}` }).click();
  const expand = page.getByRole("button", { name: "Expand editor" });
  await expand.click();
  const dialog = page.getByRole("dialog", { name: `Daily note for ${date}` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Split", exact: true })).toHaveAttribute("aria-pressed", "true");

  const editor = dialog.getByRole("textbox", { name: "Daily Markdown" });
  const markdown = "# Project journal\n\nA quiet space to plan and reflect.\n\n## Today\n\n- [x] Review the outline\n- [ ] Write the next section\n\n> Keep the next step small.\n\n| Focus | Next step |\n| --- | --- |\n| Research | Compare findings |\n| Writing | Finish the introduction |";
  await editor.fill(markdown);
  await expect(dialog.getByRole("heading", { name: "Project journal" })).toBeVisible();
  const preview = dialog.getByRole("region", { name: "Markdown preview" });
  const inputBox = await editor.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  if (mobile) {
    expect(previewBox!.y).toBeGreaterThan(inputBox!.y);
  } else {
    expect(previewBox!.x).toBeGreaterThan(inputBox!.x);
  }
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("expanded-split.png") });

  await dialog.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "Project journal" })).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("expanded-preview.png") });

  // The modal makes background controls inert to programmatic focus.
  await dialog.getByRole("button", { name: "Preview", exact: true }).focus();
  await page.getByRole("button", { name: "Timeline", exact: true, includeHidden: true }).first().evaluate((element) => element.focus());
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(expand).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Daily Markdown" })).toHaveValue(markdown);
  await expect(page.getByRole("region", { name: "Markdown preview" })).toHaveCount(0);

  await expand.click();
  await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(editor).toHaveValue(markdown);
  await expect(preview).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close expanded editor" }).click();
  await page.reload();
  await openCalendar(page, mobile);
  await page.getByRole("button", { name: `Open ${date}` }).click();
  await expect(page.getByRole("textbox", { name: "Daily Markdown" })).toHaveValue(markdown);
});

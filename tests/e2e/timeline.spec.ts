import { expect, test } from "@playwright/test";

test("creates a project and milestone in the timeline", async ({
  page,
}, testInfo) => {
  const projectName = `Thesis ${testInfo.project.name}`;
  const milestoneTitle = `First draft ${testInfo.project.name}`;
  await page.goto("/#token=e2e-token");

  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Projects", pressed: false })
      .click();
  }

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("button", { name: `Open ${projectName}` }),
  ).toBeVisible();

  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Timeline", pressed: false })
      .click();
  }

  await page.getByRole("button", { name: "New milestone" }).click();
  const dialog = page.getByRole("dialog", { name: "New milestone" });
  await dialog.getByLabel("Short title").fill(milestoneTitle);
  await dialog.getByLabel("Date").fill("2026-06-30");
  await dialog
    .getByRole("combobox", { exact: true, name: "Project" })
    .selectOption({ label: projectName });
  await dialog.getByRole("button", { name: "Create milestone" }).click();

  await expect(
    page.getByRole("button", { name: `Open ${milestoneTitle}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("main", { name: "Timeline" }).getByText(projectName),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`timeline-${testInfo.project.name}.png`),
  });
});

test("archives and restores a project", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const projectName = `Archived project ${testInfo.project.name}`;
  await page.goto("/#token=e2e-token");

  if (mobile) {
    await page
      .getByRole("button", { name: "Projects", pressed: false })
      .click();
  }

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  await page
    .getByRole("button", { name: `Open ${projectName}` })
    .click();
  await page.getByRole("button", { name: "Archive project" }).click();

  if (mobile) {
    await page
      .getByRole("button", { name: "Projects", pressed: false })
      .click();
  }
  await expect(
    page.getByRole("button", { name: `Open ${projectName}` }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Show archived projects" })
    .check();
  await page
    .getByRole("button", { name: `Open ${projectName}` })
    .click();

  if (mobile) {
    await expect(
      page.getByRole("button", { name: "Unarchive project" }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Unarchive project" }).click();

  if (mobile) {
    await page
      .getByRole("button", { name: "Projects", pressed: false })
      .click();
  }
  await expect(
    page.getByRole("button", { name: `Open ${projectName}` }),
  ).toBeVisible();
});

package app

import "Q-Solver/pkg/config"

// SelectResume 选择简历文件
func (a *App) SelectResume() string {
	path := a.resumeService.SelectResume(a.ctx)
	if path != "" {
		_ = a.configManager.Patch(func(cfg *config.Config) {
			cfg.ResumePath = path
		})
	}
	return path
}

// ClearResume 清除简历
func (a *App) ClearResume() {
	a.resumeService.ClearResume()
	_ = a.configManager.Patch(func(cfg *config.Config) {
		cfg.ResumePath = ""
		cfg.ResumeContent = ""
	})
}

// GetResumePDF 获取简历 Base64
func (a *App) GetResumePDF() (string, error) {
	return a.resumeService.GetResumeBase64()
}

// ParseResume 将本地提取的 PDF 文字和扫描页交给当前模型整理为 Markdown。
func (a *App) ParseResume(text string, images []string, apiKey, baseURL, model string) (string, error) {
	return a.resumeService.ParseResume(a.ctx, text, images, apiKey, baseURL, model)
}

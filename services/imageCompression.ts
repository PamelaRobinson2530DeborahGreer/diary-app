// services/imageCompression.ts

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export class ImageCompressionService {
  private defaultOptions: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    mimeType: 'image/jpeg'
  };

  /**
   * 压缩图片文件
   */
  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<Blob> {
    const config = { ...this.defaultOptions, ...options };

    // 如果文件已经很小，不需要压缩
    if (file.size < 100 * 1024) { // < 100KB
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      img.onload = () => {
        try {
          // 计算压缩后的尺寸
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            config.maxWidth!,
            config.maxHeight!
          );

          // 设置画布尺寸
          canvas.width = width;
          canvas.height = height;

          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 如果压缩后反而更大，返回原文件
                if (blob.size > file.size) {
                  resolve(file);
                } else {
                  resolve(blob);
                }
              } else {
                reject(new Error('图片压缩失败'));
              }
            },
            config.mimeType,
            config.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      // 加载图片
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 计算压缩后的尺寸，保持纵横比
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // 如果原图尺寸小于最大值，不需要调整
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // 计算缩放比例
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.floor(originalWidth * ratio),
      height: Math.floor(originalHeight * ratio)
    };
  }

  /**
   * 创建图片预览 URL
   */
  createPreviewUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * 清理预览 URL
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * 获取图片尺寸信息
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        reject(new Error('无法读取图片尺寸'));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 验证文件类型
   */
  isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

export const imageCompression = new ImageCompressionService();
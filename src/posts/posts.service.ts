import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';
import { User, UserRole } from 'src/auth/entities/user.entity';

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private readonly postRepository: Repository<Post>) {}

  findAll(): Promise<Post[]> {
    return this.postRepository.find({ relations: ['authorName'] });
  }

  async findOne(id: number): Promise<Post> {
    const singlePost = await this.postRepository.findOne({
      where: { id },
      relations: ['authorName'],
    });
    if (!singlePost) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return singlePost;
  }

  create(post: CreatePostDto, authorName: User): Promise<Post> {
    const newPost = this.postRepository.create({
      title: post.title,
      content: post.content,
      authorName,
    });

    return this.postRepository.save(newPost);
  }

  async update(id: number, postData: UpdatePostDto, user: User): Promise<Post> {
    const findPostToUpdate = await this.findOne(id);
    if (findPostToUpdate.authorName.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not admin or not the author of this post.');
    }
    findPostToUpdate.title = postData.title ?? findPostToUpdate.title;
    findPostToUpdate.content = postData.content ?? findPostToUpdate.content;
    return this.postRepository.save(findPostToUpdate);
  }

  async remove(id: number, user: User): Promise<void> {
    const findPostToRemove = await this.findOne(id);
    if (findPostToRemove.authorName.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not admin or not the author of this post.');
    }
    await this.postRepository.delete(findPostToRemove);
  }
}
